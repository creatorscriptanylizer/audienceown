import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  aggregateExclusionReasons,
  aggregateRecipientsByTransport,
  deduplicateRecipients,
  evaluateRecipientEligibility,
  resolvePreferenceCategory,
  type DeliveryTransport,
  type EligibleRecipient,
  type RecipientCandidate,
  type RecipientExclusionReason,
} from "@/lib/update-recipients";
import type { BroadcastType } from "@/lib/updates";
import { getAudienceRule, type BroadcastIntent } from "@/lib/broadcast-studio";

type DeliveryResolution = {
  update: {
    id: string;
    creator_id: string;
    broadcast_type: BroadcastType;
    broadcast_intent: BroadcastIntent;
    affected_platform_connection_id: string | null;
    status: string;
    title: string;
    subject: string;
    content: string;
    preview_text: string;
    cta_label: string | null;
    cta_url: string | null;
  };
  eligibleRecipients: EligibleRecipient[];
  eligible: number;
  duplicates: number;
  excluded: Partial<Record<RecipientExclusionReason, number>>;
  byTransport: Record<DeliveryTransport, number>;
};

export type PublicationSummary = {
  status: "published";
  updateId: string;
  eligible: number;
  queued: number;
  duplicates: number;
  excluded: number;
  byTransport: Record<DeliveryTransport, number>;
};

export class PublicationError extends Error {
  constructor(
    public readonly code: "zero_audience" | "preparation_failed" | "publication_failed",
  ) {
    super(code);
  }
}

async function decryptContact(ciphertext: string, secret: string) {
  try {
    const payload = Buffer.from(ciphertext, "base64");
    if (payload.byteLength <= 12) return null;
    const keyBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
    const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: payload.subarray(0, 12) },
      key,
      payload.subarray(12),
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

export async function getEligibleRecipientsForUpdate(
  updateId: string,
  creatorId: string,
): Promise<DeliveryResolution> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Delivery queue is not configured.");
  const encryptionKey = process.env.CONTACT_ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error("Contact decryption is not configured.");

  const { data: update, error: updateError } = await admin.from("creator_updates").select(
    "id,creator_id,broadcast_type,broadcast_intent,affected_platform_connection_id,status,title,subject,content,preview_text,cta_label,cta_url",
  ).eq("id", updateId).eq("creator_id", creatorId).maybeSingle();
  if (updateError || !update) throw new Error("Update not found.");

  const preferenceCategory = resolvePreferenceCategory(update.broadcast_type);
  let platform: string | null = null;
  if (update.affected_platform_connection_id) {
    const { data: account, error: accountError } = await admin.from("connected_accounts")
      .select("platform")
      .eq("id", update.affected_platform_connection_id)
      .eq("creator_id", creatorId)
      .eq("account_type", "official")
      .maybeSingle();
    if (accountError || !account) throw new Error("Affected platform is unavailable.");
    platform = account.platform;
  }

  let connectionsQuery = admin.from("follower_connections").select(
    "id,creator_id,follower_contact_id,status,selected_recovery_method_id",
  ).eq("creator_id", creatorId);
  const audienceRule = getAudienceRule({
    intent: update.broadcast_intent,
    affectedPlatformConnectionId: update.affected_platform_connection_id,
  });
  if (audienceRule === "affected_platform" || audienceRule === "platform_followers") {
    if (!platform) throw new Error("A platform is required to resolve this audience.");
    connectionsQuery = connectionsQuery.eq("source_platform", platform);
  }
  const { data: connections, error: connectionsError } = await connectionsQuery;
  if (connectionsError) throw new Error("Audience could not be loaded.");

  const connectionRows = connections ?? [];
  const connectionIds = connectionRows.map((row) => row.id);
  const contactIds = [...new Set(connectionRows.map((row) => row.follower_contact_id))];
  const [{ data: contacts }, { data: methods }, { data: preferences }, { data: existing }] = await Promise.all([
    contactIds.length
      ? admin.from("follower_contacts").select(
        "id,email_ciphertext,email_hash,phone_ciphertext,phone_hash",
      ).in("id", contactIds)
      : Promise.resolve({ data: [] }),
    contactIds.length
      ? admin.from("follower_recovery_methods").select(
        "id,follower_contact_id,method_type,method_status,destination_hash,provider_identifier,created_at",
      ).in("follower_contact_id", contactIds).order("created_at").order("id")
      : Promise.resolve({ data: [] }),
    connectionIds.length
      ? admin.from("follower_category_preferences").select(
        "follower_connection_id,category_key,enabled",
      ).in("follower_connection_id", connectionIds).eq("category_key", preferenceCategory)
      : Promise.resolve({ data: [] }),
    connectionIds.length
      ? admin.from("update_deliveries").select("connection_id,transport").eq("update_id", updateId)
      : Promise.resolve({ data: [] }),
  ]);

  const contactById = new Map((contacts ?? []).map((contact) => [contact.id, contact]));
  const methodsByContact = new Map<string, NonNullable<typeof methods>>();
  for (const method of methods ?? []) {
    methodsByContact.set(method.follower_contact_id, [
      ...(methodsByContact.get(method.follower_contact_id) ?? []),
      method,
    ]);
  }
  const preferenceByConnection = new Map(
    (preferences ?? []).map((preference) => [preference.follower_connection_id, preference.enabled]),
  );
  const existingByConnection = new Map<string, DeliveryTransport[]>();
  for (const delivery of existing ?? []) {
    existingByConnection.set(delivery.connection_id, [
      ...(existingByConnection.get(delivery.connection_id) ?? []),
      delivery.transport,
    ]);
  }

  const candidates: RecipientCandidate[] = await Promise.all(connectionRows.map(async (connection) => {
    const contact = contactById.get(connection.follower_contact_id);
    const email = contact?.email_ciphertext
      ? await decryptContact(contact.email_ciphertext, encryptionKey)
      : null;
    const phone = contact?.phone_ciphertext
      ? await decryptContact(contact.phone_ciphertext, encryptionKey)
      : null;
    const contactMethods = methodsByContact.get(connection.follower_contact_id) ?? [];
    return {
      connectionId: connection.id,
      contactId: connection.follower_contact_id,
      creatorId: connection.creator_id,
      expectedCreatorId: creatorId,
      connectionStatus: connection.status as RecipientCandidate["connectionStatus"],
      selectedRecoveryMethodId: connection.selected_recovery_method_id,
      destinations: contactMethods.map((method) => ({
        recoveryMethodId: method.id,
        contactId: method.follower_contact_id,
        methodType: method.method_type,
        value: method.method_type === "email"
          ? email
          : method.method_type === "sms" || method.method_type === "whatsapp"
            ? phone
            : method.method_type === "web_push"
              ? method.provider_identifier
              : null,
        destinationHash: method.method_type === "web_push" ? null : method.destination_hash,
        verified: method.method_status === "verified",
        active: method.method_status === "verified"
          && (method.method_type !== "web_push" || Boolean(method.provider_identifier)),
      })),
      preferenceEnabled: preferenceByConnection.get(connection.id) === true,
      existingTransports: existingByConnection.get(connection.id) ?? [],
    };
  }));

  const evaluations = candidates.map((candidate) =>
    evaluateRecipientEligibility(candidate, update.broadcast_type),
  );
  const eligible = evaluations.flatMap((evaluation) =>
    evaluation.eligible ? [evaluation.recipient] : [],
  );
  const deduplicated = deduplicateRecipients(eligible);
  const duplicateExclusions = evaluations.filter((evaluation) =>
    !evaluation.eligible && evaluation.reason === "duplicate",
  ).length + deduplicated.duplicates;

  return {
    update,
    eligibleRecipients: deduplicated.recipients,
    eligible: deduplicated.recipients.length,
    duplicates: duplicateExclusions,
    excluded: aggregateExclusionReasons(evaluations),
    byTransport: aggregateRecipientsByTransport(deduplicated.recipients),
  };
}

export async function publishDeliveryQueue(
  updateId: string,
  creatorId: string,
): Promise<PublicationSummary> {
  let resolution: DeliveryResolution;
  try {
    resolution = await getEligibleRecipientsForUpdate(updateId, creatorId);
  } catch {
    throw new PublicationError("preparation_failed");
  }
  if (resolution.update.status !== "queued" && resolution.eligible === 0) {
    throw new PublicationError("zero_audience");
  }
  const supabase = await createClient();
  if (!supabase) throw new PublicationError("publication_failed");

  const { data: rpcSummary, error } = await supabase.rpc("publish_update_delivery_queue", {
    p_update_id: updateId,
    p_creator_id: creatorId,
    p_recipients: resolution.eligibleRecipients.map((recipient) => ({
      connection_id: recipient.connectionId,
      recovery_method_id: recipient.recoveryMethodId,
      destination: recipient.destination,
      destination_hash: recipient.destinationHash,
    })),
  });
  if (error) throw new PublicationError("publication_failed");
  const result = rpcSummary as Partial<PublicationSummary> | null;
  if (result?.status !== "published" || result.updateId !== updateId) {
    throw new PublicationError("publication_failed");
  }
  return {
    status: "published",
    updateId,
    eligible: result.eligible ?? resolution.eligible,
    queued: result.queued ?? 0,
    duplicates: result.duplicates ?? resolution.duplicates,
    excluded: Object.entries(resolution.excluded).reduce(
      (sum, [reason, count]) => reason === "duplicate" ? sum : sum + (count ?? 0),
      0,
    ),
    byTransport: Object.fromEntries(
      (["email", "sms", "whatsapp", "browser_notification"] as const).map((transport) => [
        transport,
        result.byTransport?.[transport] ?? 0,
      ]),
    ) as Record<DeliveryTransport, number>,
  };
}

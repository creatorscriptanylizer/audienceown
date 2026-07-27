import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  aggregateExclusionReasons,
  deduplicateRecipients,
  evaluateRecipientEligibility,
  resolvePreferenceCategory,
  type EligibleRecipient,
  type RecipientCandidate,
  type RecipientExclusionReason,
} from "@/lib/update-recipients";
import type { BroadcastType } from "@/lib/updates";

type DeliveryResolution = {
  update: {
    id: string;
    creator_id: string;
    broadcast_type: BroadcastType;
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
};

export type DeliveryQueueSummary = {
  eligible: number;
  created: number;
  duplicates: number;
  excluded: Partial<Record<RecipientExclusionReason, number>>;
};

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
    "id,creator_id,broadcast_type,status,title,subject,content,preview_text,cta_label,cta_url",
  ).eq("id", updateId).eq("creator_id", creatorId).maybeSingle();
  if (updateError || !update) throw new Error("Update not found.");

  const preferenceCategory = resolvePreferenceCategory(update.broadcast_type);
  const { data: connections, error: connectionsError } = await admin.from("follower_connections").select(
    "id,creator_id,follower_contact_id,status",
  ).eq("creator_id", creatorId);
  if (connectionsError) throw new Error("Audience could not be loaded.");

  const connectionRows = connections ?? [];
  const connectionIds = connectionRows.map((row) => row.id);
  const contactIds = [...new Set(connectionRows.map((row) => row.follower_contact_id))];
  const [{ data: contacts }, { data: methods }, { data: preferences }, { data: existing }] = await Promise.all([
    contactIds.length
      ? admin.from("follower_contacts").select("id,email_ciphertext,email_hash").in("id", contactIds)
      : Promise.resolve({ data: [] }),
    contactIds.length
      ? admin.from("follower_recovery_methods").select(
        "follower_contact_id,method_type,method_status,destination_hash",
      ).in("follower_contact_id", contactIds).eq("method_type", "email")
      : Promise.resolve({ data: [] }),
    connectionIds.length
      ? admin.from("follower_category_preferences").select(
        "follower_connection_id,category_key,enabled",
      ).in("follower_connection_id", connectionIds).eq("category_key", preferenceCategory)
      : Promise.resolve({ data: [] }),
    connectionIds.length
      ? admin.from("update_deliveries").select("connection_id").eq("update_id", updateId)
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
  const existingConnections = new Set((existing ?? []).map((delivery) => delivery.connection_id));

  const candidates: RecipientCandidate[] = await Promise.all(connectionRows.map(async (connection) => {
    const contact = contactById.get(connection.follower_contact_id);
    const email = contact?.email_ciphertext
      ? await decryptContact(contact.email_ciphertext, encryptionKey)
      : null;
    const emailVerified = Boolean(
      contact?.email_hash
      && methodsByContact.get(connection.follower_contact_id)?.some((method) =>
        method.method_status === "verified" && method.destination_hash === contact.email_hash),
    );
    return {
      connectionId: connection.id,
      contactId: connection.follower_contact_id,
      creatorId: connection.creator_id,
      expectedCreatorId: creatorId,
      connectionStatus: connection.status as RecipientCandidate["connectionStatus"],
      email,
      emailVerified,
      preferenceEnabled: preferenceByConnection.get(connection.id) === true,
      existingDelivery: existingConnections.has(connection.id),
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
  };
}

export async function createDeliveryQueue(
  updateId: string,
  creatorId: string,
): Promise<DeliveryQueueSummary> {
  const resolution = await getEligibleRecipientsForUpdate(updateId, creatorId);
  const supabase = await createClient();
  if (!supabase) throw new Error("Delivery queue is unavailable.");

  const { data: created, error } = await supabase.rpc("create_update_delivery_queue", {
    p_update_id: updateId,
    p_creator_id: creatorId,
    p_recipients: resolution.eligibleRecipients.map((recipient) => ({
      connection_id: recipient.connectionId,
      contact_id: recipient.contactId,
      recipient_email: recipient.recipientEmail,
    })),
  });
  if (error) throw new Error("Delivery queue could not be prepared.");

  return {
    eligible: resolution.eligible,
    created: created ?? 0,
    duplicates: resolution.duplicates,
    excluded: resolution.excluded,
  };
}

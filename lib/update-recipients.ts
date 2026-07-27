import {
  broadcastPreferenceMap,
  type BroadcastType,
} from "@/lib/updates";

export type RecipientExclusionReason =
  | "wrong_creator"
  | "inactive_connection"
  | "unsubscribed"
  | "missing_email"
  | "unverified_email"
  | "preference_disabled"
  | "duplicate"
  | "invalid_email";

export type RecipientCandidate = {
  connectionId: string;
  contactId: string;
  creatorId: string;
  expectedCreatorId: string;
  connectionStatus: "active" | "paused" | "deactivated" | "unsubscribed";
  email?: string | null;
  emailVerified: boolean;
  preferenceEnabled: boolean;
  existingDelivery: boolean;
};

export type EligibleRecipient = {
  connectionId: string;
  contactId: string;
  recipientEmail: string;
  preferenceCategory: ReturnType<typeof resolvePreferenceCategory>;
};

export type RecipientEvaluation =
  | { eligible: true; recipient: EligibleRecipient }
  | { eligible: false; reason: RecipientExclusionReason };

export function resolvePreferenceCategory(broadcastType: BroadcastType) {
  return broadcastPreferenceMap[broadcastType];
}

export function normaliseRecipientEmail(email: string) {
  return email.trim().toLowerCase().normalize("NFKC");
}

export function isUsableRecipientEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function evaluateRecipientEligibility(
  candidate: RecipientCandidate,
  broadcastType: BroadcastType,
): RecipientEvaluation {
  if (candidate.creatorId !== candidate.expectedCreatorId) {
    return { eligible: false, reason: "wrong_creator" };
  }
  if (candidate.connectionStatus === "unsubscribed") {
    return { eligible: false, reason: "unsubscribed" };
  }
  if (candidate.connectionStatus !== "active") {
    return { eligible: false, reason: "inactive_connection" };
  }
  if (!candidate.email) {
    return { eligible: false, reason: "missing_email" };
  }
  if (!candidate.emailVerified) {
    return { eligible: false, reason: "unverified_email" };
  }
  if (!candidate.preferenceEnabled) {
    return { eligible: false, reason: "preference_disabled" };
  }
  if (candidate.existingDelivery) {
    return { eligible: false, reason: "duplicate" };
  }

  const recipientEmail = normaliseRecipientEmail(candidate.email);
  if (!isUsableRecipientEmail(recipientEmail)) {
    return { eligible: false, reason: "invalid_email" };
  }

  return {
    eligible: true,
    recipient: {
      connectionId: candidate.connectionId,
      contactId: candidate.contactId,
      recipientEmail,
      preferenceCategory: resolvePreferenceCategory(broadcastType),
    },
  };
}

export function deduplicateRecipients(recipients: EligibleRecipient[]) {
  const seen = new Set<string>();
  const unique: EligibleRecipient[] = [];
  let duplicates = 0;

  for (const recipient of recipients) {
    if (seen.has(recipient.connectionId)) {
      duplicates += 1;
      continue;
    }
    seen.add(recipient.connectionId);
    unique.push(recipient);
  }

  return { recipients: unique, duplicates };
}

export function aggregateExclusionReasons(evaluations: RecipientEvaluation[]) {
  const counts: Partial<Record<RecipientExclusionReason, number>> = {};
  for (const evaluation of evaluations) {
    if (evaluation.eligible) continue;
    counts[evaluation.reason] = (counts[evaluation.reason] ?? 0) + 1;
  }
  return counts;
}

export function toDeliveryInsert(updateId: string, creatorId: string, recipient: EligibleRecipient) {
  return {
    update_id: updateId,
    creator_id: creatorId,
    connection_id: recipient.connectionId,
    contact_id: recipient.contactId,
    recipient_email: recipient.recipientEmail,
    preference_category: recipient.preferenceCategory,
    status: "queued" as const,
  };
}

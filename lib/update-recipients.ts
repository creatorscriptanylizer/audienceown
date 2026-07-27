import {
  broadcastPreferenceMap,
  type BroadcastType,
} from "@/lib/updates";

export const deliveryTransports = [
  "email",
  "sms",
  "whatsapp",
  "browser_notification",
] as const;

export type DeliveryTransport = (typeof deliveryTransports)[number];

export type RecipientExclusionReason =
  | "wrong_creator"
  | "inactive_connection"
  | "unsubscribed"
  | "missing_recovery_method"
  | "unsupported_transport"
  | "missing_destination"
  | "unverified_destination"
  | "inactive_browser_subscription"
  | "invalid_destination"
  | "preference_disabled"
  | "duplicate";

export type RecoveryDestination = {
  recoveryMethodId: string;
  contactId: string;
  methodType: string;
  value: string | null;
  destinationHash: string | null;
  verified: boolean;
  active: boolean;
};

export type RecipientCandidate = {
  connectionId: string;
  contactId: string;
  creatorId: string;
  expectedCreatorId: string;
  connectionStatus: "active" | "paused" | "deactivated" | "unsubscribed";
  selectedRecoveryMethodId: string | null;
  destinations: RecoveryDestination[];
  preferenceEnabled: boolean;
  existingTransports: DeliveryTransport[];
};

export type EligibleRecipient = {
  connectionId: string;
  contactId: string;
  recoveryMethodId: string;
  transport: DeliveryTransport;
  destination: string;
  destinationHash: string | null;
  preferenceCategory: ReturnType<typeof resolvePreferenceCategory>;
};

export type RecipientEvaluation =
  | { eligible: true; recipient: EligibleRecipient }
  | { eligible: false; reason: RecipientExclusionReason };

export function resolvePreferenceCategory(broadcastType: BroadcastType) {
  return broadcastPreferenceMap[broadcastType];
}

export function recoveryMethodTypeToTransport(methodType: string): DeliveryTransport | null {
  if (methodType === "email" || methodType === "sms" || methodType === "whatsapp") {
    return methodType;
  }
  return methodType === "web_push" ? "browser_notification" : null;
}

export function resolveRecoveryTransport(
  broadcastType: BroadcastType,
  selectedMethod: RecoveryDestination | null,
): DeliveryTransport | null {
  if (broadcastType !== "account_update") return "email";
  return selectedMethod
    ? recoveryMethodTypeToTransport(selectedMethod.methodType)
    : null;
}

export function normaliseEmail(email: string) {
  return email.trim().toLowerCase().normalize("NFKC");
}

export function normalisePhoneNumber(phone: string) {
  const compact = phone.trim().replace(/[()\s.-]/g, "");
  return compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
}

export function validateDestination(transport: DeliveryTransport, destination: string) {
  if (transport === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normaliseEmail(destination));
  }
  if (transport === "sms" || transport === "whatsapp") {
    return /^\+[1-9]\d{7,14}$/.test(normalisePhoneNumber(destination));
  }
  return destination.trim().length > 0;
}

export function resolveDestinationForTransport(
  destinations: RecipientCandidate["destinations"],
  transport: DeliveryTransport,
) {
  const matching = destinations.filter((destination) =>
    recoveryMethodTypeToTransport(destination.methodType) === transport);
  return matching.find((destination) => destination.verified) ?? matching[0] ?? null;
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
  if (!candidate.preferenceEnabled) {
    return { eligible: false, reason: "preference_disabled" };
  }
  const selectedMethod = candidate.selectedRecoveryMethodId
    ? candidate.destinations.find((destination) =>
      destination.recoveryMethodId === candidate.selectedRecoveryMethodId) ?? null
    : null;
  if (broadcastType === "account_update" && !candidate.selectedRecoveryMethodId) {
    return { eligible: false, reason: "missing_recovery_method" };
  }
  if (broadcastType === "account_update" && !selectedMethod) {
    return { eligible: false, reason: "missing_recovery_method" };
  }
  if (selectedMethod && selectedMethod.contactId !== candidate.contactId) {
    return { eligible: false, reason: "missing_recovery_method" };
  }
  if (
    broadcastType === "account_update"
    && selectedMethod
    && !recoveryMethodTypeToTransport(selectedMethod.methodType)
  ) {
    return { eligible: false, reason: "unsupported_transport" };
  }

  const transport = resolveRecoveryTransport(broadcastType, selectedMethod);
  if (!transport) {
    return { eligible: false, reason: "missing_recovery_method" };
  }
  if (candidate.existingTransports.includes(transport)) {
    return { eligible: false, reason: "duplicate" };
  }

  const destination = broadcastType === "account_update"
    ? selectedMethod
    : resolveDestinationForTransport(candidate.destinations, transport);
  if (!destination || !destination.value) {
    return {
      eligible: false,
      reason: transport === "browser_notification"
        ? "inactive_browser_subscription"
        : "missing_destination",
    };
  }
  if (!destination.verified) {
    return { eligible: false, reason: "unverified_destination" };
  }
  if (transport === "browser_notification" && !destination.active) {
    return { eligible: false, reason: "inactive_browser_subscription" };
  }
  if (!validateDestination(transport, destination.value)) {
    return { eligible: false, reason: "invalid_destination" };
  }

  const normalizedDestination = transport === "email"
    ? normaliseEmail(destination.value)
    : transport === "sms" || transport === "whatsapp"
      ? normalisePhoneNumber(destination.value)
      : destination.value;

  return {
    eligible: true,
    recipient: {
      connectionId: candidate.connectionId,
      contactId: candidate.contactId,
      recoveryMethodId: destination.recoveryMethodId,
      transport,
      destination: normalizedDestination,
      destinationHash: destination.destinationHash,
      preferenceCategory: resolvePreferenceCategory(broadcastType),
    },
  };
}

export function deduplicateRecipients(recipients: EligibleRecipient[]) {
  const seen = new Set<string>();
  const unique: EligibleRecipient[] = [];
  let duplicates = 0;

  for (const recipient of recipients) {
    const key = `${recipient.connectionId}:${recipient.transport}`;
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
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

export function aggregateRecipientsByTransport(recipients: EligibleRecipient[]) {
  return Object.fromEntries(deliveryTransports.map((transport) => [
    transport,
    recipients.filter((recipient) => recipient.transport === transport).length,
  ])) as Record<DeliveryTransport, number>;
}

export function createDeliveryInsert(updateId: string, creatorId: string, recipient: EligibleRecipient) {
  return {
    update_id: updateId,
    creator_id: creatorId,
    connection_id: recipient.connectionId,
    contact_id: recipient.contactId,
    recovery_method_id: recipient.recoveryMethodId,
    transport: recipient.transport,
    destination: recipient.destination,
    destination_hash: recipient.destinationHash,
    preference_category: recipient.preferenceCategory,
    status: "queued" as const,
  };
}

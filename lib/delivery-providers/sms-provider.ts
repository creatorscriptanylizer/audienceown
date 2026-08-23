import type {
  DeliveryMessage,
  DeliveryProvider,
  DeliveryProviderResult,
} from "@/lib/delivery-providers/types";

export const SMS_MAX_CHARACTERS = 320;

export function buildSmsMessage(message: DeliveryMessage) {
  const creator = message.metadata.creatorName ?? message.title;
  const heading = message.metadata.broadcastType === "account_update"
    ? `AudienceOwn · Recovery alert from ${creator}`
    : message.metadata.broadcastType === "livestream"
      ? `AudienceOwn · ${creator} is live`
      : message.metadata.broadcastType === "product_launch"
        ? `AudienceOwn · New from ${creator}`
        : message.metadata.broadcastType === "event"
          ? `AudienceOwn · Event from ${creator}`
          : message.metadata.broadcastType === "new_content"
            ? `AudienceOwn · New from ${creator}`
            : `AudienceOwn · ${creator}`;
  const url = message.notificationUrl ?? "/";
  const essential = `${heading.slice(0, 100)}\n\nOpen: ${url}`;
  const available = Math.max(0, SMS_MAX_CHARACTERS - essential.length - 2);
  const preview = message.text.split("\n")[0].trim();
  const summary = preview.length <= available
    ? preview
    : `${preview.slice(0, Math.max(0, available - 1)).trimEnd()}…`;
  return summary ? `${heading.slice(0, 100)}\n\n${summary}\n\nOpen: ${url}` : essential;
}

export type SmsSendResult =
  | { sid: string }
  | { error: { code?: number; status?: number; name?: string } };

export type SmsSender = (input: {
  to: string;
  body: string;
  statusCallback: string;
}) => Promise<SmsSendResult>;

export function classifyTwilioFailure(error: {
  code?: number;
  status?: number;
  name?: string;
}) {
  const code = error.code;
  if ([21211, 21612, 21614].includes(code ?? 0)) {
    return { code: "invalid_destination", retryable: false };
  }
  if ([21610, 21611].includes(code ?? 0)) {
    return { code: "opted_out", retryable: false };
  }
  if ([20003, 20005, 21606].includes(code ?? 0)) {
    return { code: "provider_configuration", retryable: false };
  }
  if (error.status === 429 || code === 20429) {
    return { code: "rate_limited", retryable: true };
  }
  if ((error.status ?? 0) >= 500) {
    return { code: "temporary_provider_failure", retryable: true };
  }
  return { code: "provider_rejected", retryable: false };
}

export function createSmsProvider(sender: SmsSender | null): DeliveryProvider {
  return {
    transport: "sms",
    async send(message): Promise<DeliveryProviderResult> {
      if (!sender) {
        return {
          ok: false,
          provider: "twilio",
          code: "provider_not_configured",
          reason: "SMS delivery is not configured.",
          retryable: false,
        };
      }
      try {
        const result = await sender({
          to: message.destination,
          body: buildSmsMessage(message),
          statusCallback: message.statusCallbackUrl ?? "",
        });
        if ("sid" in result) {
          return {
            ok: true,
            status: "accepted",
            provider: "twilio",
            providerMessageId: result.sid,
          };
        }
        const failure = classifyTwilioFailure(result.error);
        return {
          ok: false,
          provider: "twilio",
          code: failure.code,
          reason: "The SMS provider did not accept this recovery alert.",
          retryable: failure.retryable,
        };
      } catch {
        return {
          ok: false,
          provider: "twilio",
          code: "temporary_provider_failure",
          reason: "The SMS provider could not be reached.",
          retryable: true,
        };
      }
    },
  };
}

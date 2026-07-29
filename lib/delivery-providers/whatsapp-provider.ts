import type {
  DeliveryMessage,
  DeliveryProvider,
  DeliveryProviderResult,
} from "@/lib/delivery-providers/types";

export const WHATSAPP_CREATOR_MAX = 80;
export const WHATSAPP_SUMMARY_MAX = 600;

function sanitize(value: string, limit: number) {
  const clean = value.normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length <= limit
    ? clean
    : `${clean.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

export type WhatsAppRecoveryMessage = {
  contentSid: string;
  contentVariables: Record<string, string>;
  statusCallbackUrl: string;
};

export function buildWhatsAppRecoveryMessage(
  message: DeliveryMessage,
  contentSid: string,
): WhatsAppRecoveryMessage {
  return {
    contentSid,
    contentVariables: {
      "1": sanitize(message.metadata.creatorName ?? message.title, WHATSAPP_CREATOR_MAX),
      "2": sanitize(message.text.split("\n")[0] ?? "", WHATSAPP_SUMMARY_MAX),
      "3": message.notificationUrl ?? "",
    },
    statusCallbackUrl: message.statusCallbackUrl ?? "",
  };
}

export type WhatsAppSendResult =
  | { sid: string }
  | { error: { code?: number; status?: number; name?: string } };

export type WhatsAppSender = (input: {
  from: string;
  to: string;
  contentSid: string;
  contentVariables: string;
  statusCallback: string;
}) => Promise<WhatsAppSendResult>;

export function classifyWhatsAppFailure(error: { code?: number; status?: number }) {
  const code = error.code ?? 0;
  if ([21211, 21612, 21614, 63024].includes(code)) return { code: "invalid_destination", retryable: false };
  if ([63003, 63018].includes(code)) return { code: "not_whatsapp_capable", retryable: false };
  if ([21610, 63016].includes(code)) return { code: "not_opted_in", retryable: false };
  if ([63040, 63041].includes(code)) return { code: "template_not_approved", retryable: false };
  if (code === 63042) return { code: "template_paused", retryable: false };
  if (code === 63043) return { code: "template_disabled", retryable: false };
  if ([20003, 20005, 21606].includes(code)) return { code: "provider_configuration", retryable: false };
  if (error.status === 429 || code === 20429) return { code: "provider_rate_limited", retryable: true };
  if ((error.status ?? 0) >= 500) return { code: "provider_temporary", retryable: true };
  return { code: "provider_rejected", retryable: false };
}

export function createWhatsAppProvider(config: {
  sender: WhatsAppSender;
  from: string;
  contentSid: string;
} | null): DeliveryProvider {
  return {
    transport: "whatsapp",
    async send(message): Promise<DeliveryProviderResult> {
      if (!config) return {
        ok: false, provider: "twilio-whatsapp", code: "provider_configuration",
        reason: "WhatsApp delivery is not configured.", retryable: false,
      };
      const built = buildWhatsAppRecoveryMessage(message, config.contentSid);
      try {
        const result = await config.sender({
          from: config.from,
          to: `whatsapp:${message.destination}`,
          contentSid: built.contentSid,
          contentVariables: JSON.stringify(built.contentVariables),
          statusCallback: built.statusCallbackUrl,
        });
        if ("sid" in result) return {
          ok: true, status: "accepted", provider: "twilio-whatsapp",
          providerMessageId: result.sid,
        };
        const failure = classifyWhatsAppFailure(result.error);
        return {
          ok: false, provider: "twilio-whatsapp", code: failure.code,
          reason: "The WhatsApp provider did not accept this recovery alert.",
          retryable: failure.retryable,
        };
      } catch {
        return {
          ok: false, provider: "twilio-whatsapp", code: "provider_temporary",
          reason: "The WhatsApp provider could not be reached.", retryable: true,
        };
      }
    },
  };
}

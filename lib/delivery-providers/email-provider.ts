import type {
  DeliveryMessage,
  DeliveryProvider,
  DeliveryProviderResult,
} from "@/lib/delivery-providers/types";

export type EmailSendResult =
  | { id: string }
  | { error: { name?: string; message?: string; statusCode?: number } };

export type EmailSender = (input: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}) => Promise<EmailSendResult>;

function isRetryableEmailError(error: { name?: string; statusCode?: number }) {
  return error.statusCode === 408
    || error.statusCode === 429
    || Boolean(error.statusCode && error.statusCode >= 500)
    || error.name === "rate_limit_exceeded"
    || error.name === "internal_server_error";
}

export function createEmailProvider(sender: EmailSender | null, from: string | null): DeliveryProvider {
  return {
    transport: "email",
    async send(message: DeliveryMessage): Promise<DeliveryProviderResult> {
      if (!sender || !from) {
        return {
          ok: false,
          provider: "resend",
          code: "provider_not_configured",
          reason: "Email delivery is not configured.",
          retryable: false,
        };
      }
      const result = await sender({
        from,
        to: message.destination,
        subject: message.subject ?? message.title,
        text: message.text,
        html: message.html,
      });
      if ("id" in result) {
        return { ok: true, provider: "resend", providerMessageId: result.id };
      }
      return {
        ok: false,
        provider: "resend",
        code: result.error.name ?? "email_provider_error",
        reason: "The email provider did not accept this notification.",
        retryable: isRetryableEmailError(result.error),
      };
    },
  };
}

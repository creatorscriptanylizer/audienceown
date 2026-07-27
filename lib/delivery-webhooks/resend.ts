import { Resend, type WebhookEventPayload } from "resend";
import type { NormalizedDeliveryEvent } from "@/lib/delivery-webhooks/types";

export type ResendWebhookHeaders = {
  id: string;
  timestamp: string;
  signature: string;
};

export function verifyResendWebhook(
  rawBody: string,
  headers: ResendWebhookHeaders,
  webhookSecret: string,
) {
  // Verification is local, but the SDK constructor still requires a syntactically
  // present API key. This sentinel is never used for a network request.
  return new Resend("re_webhook_verification").webhooks.verify({
    payload: rawBody,
    headers,
    webhookSecret,
  });
}

export function normalizeResendEvent(
  event: WebhookEventPayload,
  providerEventId: string,
): NormalizedDeliveryEvent {
  const messageId = "email_id" in event.data ? event.data.email_id : null;
  const normalized = event.type === "email.sent" ? "accepted"
    : event.type === "email.delivered" ? "delivered"
      : event.type === "email.bounced" || event.type === "email.failed"
        || event.type === "email.suppressed" ? "bounced"
        : event.type === "email.complained" ? "complained"
          : "ignored";
  const errorCode = event.type === "email.bounced" ? event.data.bounce.type
    : event.type === "email.failed" ? "provider_failed"
      : event.type === "email.suppressed" ? event.data.suppressed.type
        : null;
  const errorMessage = event.type === "email.bounced" ? event.data.bounce.message
    : event.type === "email.failed" ? event.data.failed.reason
      : event.type === "email.suppressed" ? event.data.suppressed.message
        : null;
  return {
    provider: "resend",
    providerEventId,
    providerMessageId: messageId,
    type: normalized,
    occurredAt: event.created_at || null,
    rawType: event.type,
    errorCode,
    errorMessage,
  };
}

export function minimalResendEventPayload(event: NormalizedDeliveryEvent) {
  return {
    raw_type: event.rawType,
    error_code: event.errorCode,
    error_message: event.errorMessage,
  };
}

import { createAdminClient } from "@/lib/supabase/admin";
import { handleResendWebhook, minimalResendEventPayload } from "@/lib/delivery-webhooks/handler";
import { verifyResendWebhook } from "@/lib/delivery-webhooks/resend";

export async function POST(request: Request) {
  return handleResendWebhook(request, {
    webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
    verify: verifyResendWebhook,
    async apply(event) {
      const admin = createAdminClient();
      if (!admin) throw new Error("Webhook database is unavailable.");
      const { data, error } = await admin.rpc("apply_update_delivery_event", {
        p_provider: event.provider,
        p_provider_event_id: event.providerEventId,
        p_provider_message_id: event.providerMessageId ?? "",
        p_event_type: event.rawType,
        p_normalized_status: event.type === "ignored" ? "" : event.type,
        p_event_timestamp: event.occurredAt ?? new Date().toISOString(),
        p_payload: minimalResendEventPayload(event),
        p_signature_verified: true,
      });
      if (error) throw new Error("Webhook event could not be stored.");
      const result = data && typeof data === "object" && !Array.isArray(data)
        ? data as Record<string, unknown>
        : {};
      console.info(JSON.stringify({
        event: "delivery_webhook_processed",
        provider: event.provider,
        providerEventId: event.providerEventId,
        providerMessageId: event.providerMessageId,
        deliveryId: typeof result.deliveryId === "string" ? result.deliveryId : null,
        normalizedType: event.type,
        processingOutcome: typeof result.processingStatus === "string"
          ? result.processingStatus
          : "unknown",
      }));
    },
  });
}

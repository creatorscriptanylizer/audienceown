import "server-only";

import { aggregateDispatchResults, dispatchClaimedDelivery } from "@/lib/delivery-dispatch-core";
import type { ClaimedDelivery } from "@/lib/delivery-message";
import { getDeliveryProvider } from "@/lib/delivery-providers";
import { createAdminClient } from "@/lib/supabase/admin";

export const DELIVERY_MAX_ATTEMPTS = 3;
export const DELIVERY_STUCK_TIMEOUT_SECONDS = 15 * 60;
export const DELIVERY_MAX_BATCH_SIZE = 25;

function logDelivery(
  event: string,
  delivery: ClaimedDelivery,
  details: Record<string, string | number | boolean> = {},
) {
  console.info(JSON.stringify({
    event,
    deliveryId: delivery.delivery_id,
    updateId: delivery.update_id,
    creatorId: delivery.creator_id,
    transport: delivery.transport,
    attempt: delivery.attempt_count,
    ...details,
  }));
}

export async function dispatchQueuedDeliveries({ limit = 10 }: { limit?: number } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > DELIVERY_MAX_BATCH_SIZE) {
    throw new Error(`Delivery batch limit must be between 1 and ${DELIVERY_MAX_BATCH_SIZE}.`);
  }
  const admin = createAdminClient();
  if (!admin) throw new Error("Delivery execution is not configured.");

  const { data, error } = await admin.rpc("claim_update_deliveries", {
    p_limit: limit,
    p_max_attempts: DELIVERY_MAX_ATTEMPTS,
    p_stuck_timeout_seconds: DELIVERY_STUCK_TIMEOUT_SECONDS,
  });
  if (error) throw new Error("Queued deliveries could not be claimed.");

  const claimed = (data ?? []) as ClaimedDelivery[];
  const results = [];
  for (const delivery of claimed) {
    logDelivery("delivery_claimed", delivery);
    try {
      const result = await dispatchClaimedDelivery(delivery, {
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        maxAttempts: DELIVERY_MAX_ATTEMPTS,
        resolveProvider: getDeliveryProvider,
        async markAccepted(deliveryId, provider, providerMessageId) {
          const { error: markError } = await admin.rpc("mark_update_delivery_accepted", {
            p_delivery_id: deliveryId,
            p_provider: provider,
            p_provider_message_id: providerMessageId,
          });
          if (markError) throw new Error("Accepted delivery could not be recorded.");
        },
        async markFailed(input) {
          const { data: status, error: markError } = await admin.rpc("mark_update_delivery_failed", {
            p_delivery_id: input.deliveryId,
            p_provider: input.provider,
            p_code: input.code,
            p_reason: input.reason,
            p_retryable: input.retryable,
            p_max_attempts: input.maxAttempts,
          });
          if (markError || (status !== "queued" && status !== "failed")) {
            throw new Error("Failed delivery could not be recorded.");
          }
          return status;
        },
      });
      logDelivery(
        result.status === "accepted"
          ? "provider_accepted"
          : result.status === "queued"
            ? "delivery_retry_scheduled"
            : "delivery_failed",
        delivery,
        { provider: result.provider, code: result.code },
      );
      results.push(result);
    } catch {
      const provider = delivery.transport === "email"
        ? "resend"
        : delivery.transport === "browser_notification"
          ? "web-push"
          : "unsupported";
      logDelivery("delivery_state_update_failed", delivery, {
        provider,
        code: "state_update_failed",
      });
      results.push({
        deliveryId: delivery.delivery_id,
        transport: delivery.transport,
        status: "sending" as const,
        provider,
        retryable: true,
        code: "state_update_failed",
      });
    }
  }
  return aggregateDispatchResults(results);
}

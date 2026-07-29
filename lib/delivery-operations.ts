import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DeliveryOperator } from "@/lib/delivery-operator-auth";

export function parseBoundedLimit(value: string | null, fallback = 25) {
  const parsed = value === null ? fallback : Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 100 ? parsed : null;
}

export async function getOperationsOverview(limit = 25) {
  const admin = createAdminClient();
  if (!admin) throw new Error("operations_unavailable");
  const [health, providers, stuck, pending, failures] = await Promise.all([
    admin.rpc("get_delivery_system_health"),
    admin.rpc("get_delivery_provider_health", { p_window_minutes: 60 }),
    admin.rpc("get_stuck_deliveries", { p_limit: limit }),
    admin.rpc("get_pending_provider_events", { p_limit: limit }),
    admin.from("update_deliveries")
      .select("id,update_id,provider,transport,status,attempt_count,failure_code,last_attempt_at,creator_updates(title)")
      .eq("status", "failed").order("failed_at", { ascending: false }).limit(limit),
  ]);
  if (health.error || providers.error || stuck.error || pending.error || failures.error) {
    throw new Error("operations_query_failed");
  }
  return {
    health: health.data,
    providers: providers.data ?? [],
    stuck: stuck.data ?? [],
    pending: pending.data ?? [],
    failures: (failures.data ?? []).map((delivery) => ({
      id: delivery.id,
      updateId: delivery.update_id,
      updateTitle: (delivery.creator_updates as unknown as { title?: string } | null)?.title ?? "Untitled update",
      provider: delivery.provider,
      transport: delivery.transport,
      status: delivery.status,
      attemptCount: delivery.attempt_count,
      failureCode: delivery.failure_code,
      lastAttemptAt: delivery.last_attempt_at,
    })),
  };
}

export async function getSafeDeliveryInspection(id: string) {
  const admin = createAdminClient();
  if (!admin) throw new Error("operations_unavailable");
  const delivery = await admin.from("update_deliveries")
    .select("id,update_id,creator_id,transport,provider,status,attempt_count,failure_code,created_at,claimed_at,sending_at,accepted_at,delivered_at,failed_at,cancelled_at,skipped_at,last_attempt_at,provider_message_id,creator_updates(title),follower_recovery_methods(destination_masked)")
    .eq("id", id).maybeSingle();
  if (delivery.error) throw new Error("operations_query_failed");
  if (!delivery.data) return null;
  const [events, actions] = await Promise.all([
    admin.from("update_delivery_events")
      .select("id,event_type,normalized_status,event_timestamp,received_at,processing_status,provider")
      .eq("update_delivery_id", id).order("received_at"),
    admin.from("delivery_operator_actions")
      .select("id,action_type,actor_role,reason,created_at,target_provider")
      .eq("target_delivery_id", id).order("created_at"),
  ]);
  if (events.error || actions.error) throw new Error("operations_query_failed");
  const row = delivery.data;
  return {
    id: row.id, updateId: row.update_id, creatorId: row.creator_id,
    updateTitle: (row.creator_updates as unknown as { title?: string } | null)?.title ?? "Untitled update",
    transport: row.transport, provider: row.provider, status: row.status,
    attemptCount: row.attempt_count, failureCode: row.failure_code,
    createdAt: row.created_at, claimedAt: row.claimed_at, sendingAt: row.sending_at,
    acceptedAt: row.accepted_at, deliveredAt: row.delivered_at,
    failedAt: row.failed_at, cancelledAt: row.cancelled_at, skippedAt: row.skipped_at,
    lastAttemptAt: row.last_attempt_at,
    providerMessageIdPresent: Boolean(row.provider_message_id),
    maskedDestination: (row.follower_recovery_methods as unknown as { destination_masked?: string } | null)?.destination_masked ?? null,
    events: events.data ?? [], actions: actions.data ?? [],
  };
}

export async function runOperatorAction(
  action: "retry" | "release" | "reconcile",
  targetId: string,
  reason: string,
  operator: DeliveryOperator,
) {
  const admin = createAdminClient();
  if (!admin) throw new Error("operations_unavailable");
  const common = {
    p_reason: reason.trim(),
    p_actor_user_id: operator.userId,
    p_actor_role: operator.role,
  };
  if (action === "retry") return admin.rpc("retry_failed_delivery", {
    ...common, p_delivery_id: targetId,
  });
  if (action === "release") return admin.rpc("release_stuck_delivery", {
    ...common, p_delivery_id: targetId,
  });
  return admin.rpc("reconcile_pending_provider_event", {
    ...common, p_pending_event_id: targetId,
  });
}

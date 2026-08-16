import "server-only";
import { createClient } from "@/lib/supabase/server";
import { integrationStatus } from "@/lib/env";
import {
  buildRecoveryOpportunities,
  recoveryAnalyticsThresholds,
  suppressBreakdown,
  suppressCount,
  type RecoveryCoverage,
} from "@/lib/recovery-analytics";
import type { LiveRecoveryAnalytics } from "@/lib/live-recovery-analytics";
import { debugDatabaseError } from "@/lib/debug";

export type RecoveryIncidentOption = { id: string; title: string; severity: string; lifecycle_status: string; activated_at: string | null; resolved_at: string | null; updated_at: string };
export type RecoveryIncidentsResult =
  | { status: "available"; incidents: RecoveryIncidentOption[] }
  | { status: "unavailable"; reason: "query_failed"; incidents: null };
export type RecoveryUpdateResult =
  | { status: "available"; data: Record<string, unknown> }
  | { status: "absent"; data: null }
  | { status: "unavailable"; reason: "query_failed"; data: null };

export type RecoveryAnalyticsOverview = RecoveryCoverage & {
  availability: "available" | "empty";
};

export const emptyRecoveryAnalyticsOverview = (): RecoveryAnalyticsOverview => ({
  total_relationships: 0,
  recovery_ready_relationships: 0,
  uncovered_relationships: 0,
  partially_configured_relationships: 0,
  recovery_coverage_rate: null,
  change_vs_previous_snapshot: null,
  last_snapshot_at: null,
  availability: "empty",
});

export async function recoveryIncidents(): Promise<RecoveryIncidentsResult> {
  const client = await createClient();
  if (!client) return { status: "unavailable", reason: "query_failed", incidents: null };
  const { data, error } = await client.from("creator_emergencies")
    .select("id,title,severity,lifecycle_status,activated_at,resolved_at,updated_at")
    .in("lifecycle_status", ["active", "resolved", "cancelled"])
    .order("updated_at", { ascending: false }).limit(50);
  if (error) {
    debugDatabaseError("select", "creator_emergencies", error, { page: "recovery_analytics", failureCategory: "query_failed" });
    return { status: "unavailable", reason: "query_failed", incidents: null };
  }
  return { status: "available", incidents: (data ?? []).sort((a, b) => Number(b.lifecycle_status === "active") - Number(a.lifecycle_status === "active")) as RecoveryIncidentOption[] };
}

export async function liveRecoveryAnalytics(id: string) {
  const client = await createClient();
  if (!client) throw new Error("analytics_unavailable");
  const { data, error } = await client.rpc("get_live_recovery_analytics", { p_emergency_id: id });
  if (error || !data) throw new Error(error?.code === "P0002" ? "not_found" : "analytics_unavailable");
  return data as unknown as LiveRecoveryAnalytics;
}

function duration(started: number) {
  return Math.round(performance.now() - started);
}

export async function recoveryAnalyticsOverview(): Promise<RecoveryAnalyticsOverview> {
  const started = performance.now();
  const client = await createClient();
  if (!client) throw new Error("analytics_unavailable");
  const { data, error } = await client.rpc("get_creator_recovery_coverage");
  if (error) {
    console.warn(JSON.stringify({
      event: "recovery_analytics_overview_unavailable",
      category: "database_error",
    }));
    throw new Error("analytics_unavailable");
  }
  if (!data?.[0]) {
    console.info(JSON.stringify({
      event: "recovery_analytics_overview_completed",
      result_row_count: 0, duration_ms: duration(started),
    }));
    return emptyRecoveryAnalyticsOverview();
  }
  console.info(JSON.stringify({
    event: "recovery_analytics_overview_completed",
    result_row_count: 1, duration_ms: duration(started),
  }));
  return { ...(data[0] as unknown as RecoveryCoverage), availability: "available" };
}

export async function recoveryTransportBreakdown() {
  const client = await createClient();
  if (!client) throw new Error("analytics_unavailable");
  const { data, error } = await client.rpc("get_creator_recovery_transport_breakdown");
  if (error) throw new Error("analytics_unavailable");
  const threshold = recoveryAnalyticsThresholds().privacyThreshold;
  const rows = data ?? [];
  const suppressAll = rows.some((row) =>
    Number(row.relationship_count) > 0 && Number(row.relationship_count) < threshold);
  const readiness = integrationStatus();
  const availability = {
    email: readiness.resend,
    browser_notification: readiness.browserPush,
    sms: readiness.sms,
    whatsapp: readiness.whatsapp,
  };
  if (suppressAll) console.info(JSON.stringify({
    event: "recovery_analytics_privacy_suppression_applied",
    result_row_count: rows.length, suppression_applied: true,
  }));
  return rows.map((row) => ({
    transport: row.transport,
    relationshipCount: suppressAll && Number(row.relationship_count) > 0
      ? { suppressed: true, count: null, display: `Fewer than ${threshold} or suppressed for privacy` }
      : suppressCount(Number(row.relationship_count), threshold),
    percentageOfTotalAudience: suppressAll ? null : Number(row.percentage_of_total_audience),
    percentageOfRecoveryReady: suppressAll ? null : Number(row.percentage_of_recovery_ready),
    currentlyAvailable: availability[row.transport],
    configurationStatus: availability[row.transport] ? "configured" : "unavailable",
  }));
}

export async function recoveryTrend(days: number) {
  const started = performance.now();
  const client = await createClient();
  if (!client) throw new Error("analytics_unavailable");
  const { data, error } = await client.rpc("get_creator_recovery_coverage_trend", { p_days: days });
  if (error) throw new Error("analytics_unavailable");
  console.info(JSON.stringify({
    event: "recovery_analytics_trend_completed",
    date_range_days: days, result_row_count: data?.length ?? 0,
    duration_ms: duration(started),
  }));
  return data ?? [];
}

export async function recoveryFunnel() {
  const client = await createClient();
  if (!client) throw new Error("analytics_unavailable");
  const { data, error } = await client.rpc("get_creator_recovery_funnel");
  if (error) throw new Error("analytics_unavailable");
  const threshold = recoveryAnalyticsThresholds().privacyThreshold;
  const rows = data ?? [];
  const suppressDetailed = rows.slice(1).some((row) =>
    Number(row.relationship_count) > 0 && Number(row.relationship_count) < threshold);
  return rows.map((row, index) => ({
    ...row,
    relationship_count: index === 0
      ? { suppressed: false, count: Number(row.relationship_count), display: String(row.relationship_count) }
      : suppressDetailed && Number(row.relationship_count) > 0
        ? { suppressed: true, count: null, display: `Fewer than ${threshold} or suppressed for privacy` }
        : suppressCount(Number(row.relationship_count), threshold),
    percentage_of_total: index > 0 && suppressDetailed
      ? null
      : Number(row.percentage_of_total),
  }));
}

export async function recoveryUpdates(limit = 20, before?: string | null) {
  const client = await createClient();
  if (!client) throw new Error("analytics_unavailable");
  const { data, error } = await client.rpc("get_creator_recovery_broadcast_performance", {
    p_limit: limit, p_before: before ?? undefined,
  });
  if (error) throw new Error("analytics_unavailable");
  const threshold = recoveryAnalyticsThresholds().privacyThreshold;
  return (data ?? []).map((row) => ({
    ...row,
    transport_breakdown: suppressBreakdown(
      (row.transport_breakdown ?? {}) as Record<string, number>, threshold),
    provider_breakdown: suppressBreakdown(
      (row.provider_breakdown ?? {}) as Record<string, number>, threshold),
  }));
}

export async function recoveryUpdate(id: string): Promise<RecoveryUpdateResult> {
  const client = await createClient();
  if (!client) return { status: "unavailable", reason: "query_failed", data: null };
  const { data, error } = await client.rpc("get_creator_recovery_update_performance", {
    p_update_id: id,
  });
  if (error) {
    debugDatabaseError("rpc", "get_creator_recovery_update_performance", error, { page: "recovery_update_analytics", failureCategory: "query_failed" });
    return { status: "unavailable", reason: "query_failed", data: null };
  }
  if (!data) return { status: "absent", data: null };
  const row = data as Record<string, unknown>;
  const threshold = recoveryAnalyticsThresholds().privacyThreshold;
  return { status: "available", data: {
    ...row,
    transport_breakdown: suppressBreakdown(
      (row.transport_breakdown ?? {}) as Record<string, number>, threshold),
    provider_breakdown: suppressBreakdown(
      (row.provider_breakdown ?? {}) as Record<string, number>, threshold),
  } };
}

export async function recoveryOpportunities() {
  const [coverage, updates] = await Promise.all([
    recoveryAnalyticsOverview(), recoveryUpdates(10),
  ]);
  const attempted = updates.reduce((sum, row) => sum + Number(row.audience_snapshot_size), 0);
  const permanent = updates.reduce((sum, row) => sum + Number(row.permanent_failed), 0);
  const failureRate = attempted ? permanent * 100 / attempted : null;
  return buildRecoveryOpportunities(coverage, failureRate);
}

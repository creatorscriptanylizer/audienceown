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

function duration(started: number) {
  return Math.round(performance.now() - started);
}

export async function recoveryAnalyticsOverview() {
  const started = performance.now();
  const client = await createClient();
  if (!client) throw new Error("analytics_unavailable");
  const { data, error } = await client.rpc("get_creator_recovery_coverage");
  if (error || !data?.[0]) throw new Error("analytics_unavailable");
  console.info(JSON.stringify({
    event: "recovery_analytics_overview_completed",
    result_row_count: 1, duration_ms: duration(started),
  }));
  return data[0] as unknown as RecoveryCoverage;
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

export async function recoveryUpdate(id: string) {
  const client = await createClient();
  if (!client) throw new Error("analytics_unavailable");
  const { data, error } = await client.rpc("get_creator_recovery_update_performance", {
    p_update_id: id,
  });
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  const threshold = recoveryAnalyticsThresholds().privacyThreshold;
  return {
    ...row,
    transport_breakdown: suppressBreakdown(
      (row.transport_breakdown ?? {}) as Record<string, number>, threshold),
    provider_breakdown: suppressBreakdown(
      (row.provider_breakdown ?? {}) as Record<string, number>, threshold),
  };
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

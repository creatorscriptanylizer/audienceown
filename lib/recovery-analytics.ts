export type RecoveryCoverage = {
  total_relationships: number;
  recovery_ready_relationships: number;
  uncovered_relationships: number;
  partially_configured_relationships: number;
  recovery_coverage_rate: number;
  change_vs_previous_snapshot: number | null;
  last_snapshot_at: string | null;
};

export type RecoveryAnalyticsThresholds = {
  lowCoveragePercent: number;
  coverageDeclinePercent: number;
  highFailurePercent: number;
  minimumSampleSize: number;
  privacyThreshold: number;
};

function configuredNumber(value: string | undefined, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export function recoveryAnalyticsThresholds(
  environment: NodeJS.ProcessEnv = process.env,
): RecoveryAnalyticsThresholds {
  return {
    lowCoveragePercent: configuredNumber(environment.RECOVERY_ANALYTICS_LOW_COVERAGE_PERCENT, 50),
    coverageDeclinePercent: configuredNumber(environment.RECOVERY_ANALYTICS_COVERAGE_DECLINE_PERCENT, 10),
    highFailurePercent: configuredNumber(environment.RECOVERY_ANALYTICS_HIGH_FAILURE_PERCENT, 20),
    minimumSampleSize: configuredNumber(environment.RECOVERY_ANALYTICS_MIN_SAMPLE_SIZE, 10),
    privacyThreshold: configuredNumber(environment.RECOVERY_ANALYTICS_PRIVACY_THRESHOLD, 5),
  };
}

export type SuppressedMetric = {
  suppressed: boolean;
  count: number | null;
  display: string;
};

export function suppressCount(count: number, threshold: number): SuppressedMetric {
  return count > 0 && count < threshold
    ? { suppressed: true, count: null, display: `Fewer than ${threshold}` }
    : { suppressed: false, count, display: String(count) };
}

export function suppressBreakdown(
  breakdown: Record<string, number>,
  threshold: number,
) {
  const suppressAll = Object.values(breakdown).some((count) => count > 0 && count < threshold);
  return Object.fromEntries(Object.entries(breakdown).map(([key, count]) => [
    key,
    suppressAll && count > 0
      ? { suppressed: true, count: null, display: `Fewer than ${threshold} or suppressed for privacy` }
      : suppressCount(count, threshold),
  ]));
}

export type RecoveryOpportunity = {
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  metric: number | null;
  threshold: number;
  suggestedAction: string;
  dataWindow: string;
  generatedAt: string;
};

export function buildRecoveryOpportunities(
  coverage: RecoveryCoverage,
  recentFailureRate: number | null,
  thresholds = recoveryAnalyticsThresholds(),
  generatedAt = new Date().toISOString(),
): RecoveryOpportunity[] {
  if (coverage.total_relationships < thresholds.minimumSampleSize) {
    return [{
      type: "insufficient_data", severity: "info",
      title: "More data is needed",
      description: "There is not yet enough audience data for detailed recovery recommendations.",
      metric: coverage.total_relationships, threshold: thresholds.minimumSampleSize,
      suggestedAction: "Keep sharing your Recovery Pass page.",
      dataWindow: "current audience", generatedAt,
    }];
  }
  const insights: RecoveryOpportunity[] = [];
  if (coverage.recovery_coverage_rate < thresholds.lowCoveragePercent) {
    insights.push({
      type: "low_overall_coverage", severity: "warning",
      title: "Recovery coverage is below your configured threshold",
      description: "A substantial part of your active audience does not currently have a usable selected Recovery Pass.",
      metric: coverage.recovery_coverage_rate, threshold: thresholds.lowCoveragePercent,
      suggestedAction: "Add your AudienceOwn recovery page to your official profiles.",
      dataWindow: "current audience", generatedAt,
    });
  }
  if ((coverage.change_vs_previous_snapshot ?? 0) <= -thresholds.coverageDeclinePercent) {
    insights.push({
      type: "recent_coverage_decline", severity: "warning",
      title: "Recovery coverage declined",
      description: "Current coverage is lower than the previous recorded daily snapshot.",
      metric: coverage.change_vs_previous_snapshot, threshold: thresholds.coverageDeclinePercent,
      suggestedAction: "Review revoked or invalid Recovery Pass counts and confirm your recovery link is visible.",
      dataWindow: "since previous snapshot", generatedAt,
    });
  }
  if (recentFailureRate !== null && recentFailureRate >= thresholds.highFailurePercent) {
    insights.push({
      type: "high_permanent_failure_rate", severity: "critical",
      title: "Recent permanent delivery failures are elevated",
      description: "Recent recovery deliveries show a permanent failure rate at or above the configured threshold.",
      metric: recentFailureRate, threshold: thresholds.highFailurePercent,
      suggestedAction: "Review creator-safe failure categories for recent recovery updates.",
      dataWindow: "recent recovery broadcasts", generatedAt,
    });
  }
  return insights.length ? insights : [{
    type: "insufficient_data", severity: "info",
    title: "No priority recovery opportunity",
    description: "Current deterministic thresholds do not identify a priority action.",
    metric: coverage.recovery_coverage_rate, threshold: thresholds.lowCoveragePercent,
    suggestedAction: "Continue monitoring recovery coverage.",
    dataWindow: "current audience", generatedAt,
  }];
}

export function mapTrendForChart(rows: Array<{
  snapshot_date: string;
  total_relationships: number;
  recovery_ready_relationships: number;
  recovery_coverage_rate: number;
}>) {
  return rows.map((row) => ({
    date: row.snapshot_date,
    total: row.total_relationships,
    ready: row.recovery_ready_relationships,
    rate: row.recovery_coverage_rate,
  }));
}

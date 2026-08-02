export type MetricStatus = "available" | "partial" | "unavailable";
export type RecoveryMetricAvailability = {
  status: MetricStatus; value: number | null; updatedAt: string | null;
  coverage?: { supportedTransports: string[]; unsupportedTransports: string[]; measurableRecipients?: number; totalRecipients?: number };
  explanation?: string;
};
export type RecoveryRateMetric = RecoveryMetricAvailability & {
  numerator: number | null; denominator: number | null; unit: "percent";
  measurement: "confirmed" | "click_through_proxy" | "unavailable";
};
export type LiveRecoveryAnalytics = {
  emergencyId: string; title: string; severity: string; status: string;
  activatedAt: string | null; resolvedAt: string | null; calculatedAt: string;
  dataFreshness: string;
  metrics: { fansTargeted: RecoveryMetricAvailability; alertsSent: RecoveryMetricAvailability;
    alertsOpened: RecoveryMetricAvailability; recoveryPageVisits: RecoveryMetricAvailability;
    followClicks: RecoveryMetricAvailability; migrationRate: RecoveryRateMetric };
  transportBreakdown: Array<{ transport: string; targeted: number; sent: number; delivered: number; failed: number; opened: null; openCoverage: string }>;
  destinationBreakdown: Array<{ provider: string; visits: number; followClicks: number; migrationProxyClicks: number }>;
};

export const liveMetricEntries = (data: LiveRecoveryAnalytics) => [
  ["Fans targeted", data.metrics.fansTargeted], ["Alerts sent", data.metrics.alertsSent],
  ["Alerts opened", data.metrics.alertsOpened], ["Recovery page visits", data.metrics.recoveryPageVisits],
  ["Follow clicks", data.metrics.followClicks], ["Migration rate", data.metrics.migrationRate],
] as const;

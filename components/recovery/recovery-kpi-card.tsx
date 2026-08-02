import type { RecoveryMetricAvailability, RecoveryRateMetric } from "@/lib/live-recovery-analytics";
import { RecoveryMetricAvailabilityView } from "./recovery-metric-availability";

export function RecoveryKpiCard({ label, metric, stale = false }: { label: string; metric: RecoveryMetricAvailability; stale?: boolean }) {
  const rate = "unit" in metric && (metric as RecoveryRateMetric).unit === "percent";
  const value = metric.value === null ? "Unavailable" : rate ? new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 2 }).format(metric.value / 100) : new Intl.NumberFormat().format(metric.value);
  return <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4" aria-label={`${label}: ${value}; ${metric.status}${stale ? "; stale" : ""}`}>
    <h3 className="text-sm font-medium text-zinc-400">{label}</h3><p className="mt-2 text-2xl font-semibold">{value}</p>
    {stale && <p className="mt-2 text-xs text-amber-300">Stale data</p>}
    <RecoveryMetricAvailabilityView metric={metric}/>
  </article>;
}

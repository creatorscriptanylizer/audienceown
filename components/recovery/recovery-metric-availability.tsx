import type { RecoveryMetricAvailability } from "@/lib/live-recovery-analytics";

export function RecoveryMetricAvailabilityView({ metric }: { metric: RecoveryMetricAvailability }) {
  const label = metric.status === "partial" ? "Partial coverage" : metric.status === "unavailable" ? "Unavailable" : "Available";
  return <details className="mt-3 text-xs text-zinc-400">
    <summary className="cursor-pointer rounded focus:outline-none focus:ring-2 focus:ring-amber-400">{label} · Metric details</summary>
    <p className="mt-2 leading-5">{metric.explanation}</p>
    {metric.coverage && <p className="mt-1">Supported: {metric.coverage.supportedTransports.join(", ") || "None"}. Unsupported: {metric.coverage.unsupportedTransports.join(", ") || "None"}.</p>}
  </details>;
}

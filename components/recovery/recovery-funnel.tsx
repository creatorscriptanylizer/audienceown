import { liveMetricEntries, type LiveRecoveryAnalytics } from "@/lib/live-recovery-analytics";

export function LiveRecoveryFunnel({ data }: { data: LiveRecoveryAnalytics }) {
  return <section aria-labelledby="live-funnel-heading"><h2 id="live-funnel-heading" className="text-xl font-semibold">Recovery funnel</h2>
    <p className="mt-2 text-sm text-zinc-400">Unavailable stages remain unavailable; no stage-to-stage conversion is inferred.</p>
    <ol className="mt-4 grid gap-2">{liveMetricEntries(data).map(([label, metric]) => <li key={label} className="flex justify-between rounded-xl border border-white/10 p-3">
      <span>{label}</span><strong>{metric.value === null ? "Unavailable" : label === "Migration rate" ? `${metric.value}%` : metric.value}</strong>
    </li>)}</ol>
  </section>;
}

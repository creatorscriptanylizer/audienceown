import type { RecoveryOpportunity } from "@/lib/recovery-analytics";

export function RecoveryOpportunityCard({ insight }: { insight: RecoveryOpportunity }) {
  return <article className="rounded-xl border p-4">
    <div className="flex items-center justify-between gap-3"><strong>{insight.title}</strong><span className="text-xs capitalize text-zinc-500">{insight.severity}</span></div>
    <p className="mt-2 text-sm leading-6 text-zinc-400">{insight.description}</p>
    <p className="mt-3 text-sm">{insight.suggestedAction}</p>
    <small className="mt-2 block text-zinc-500">{insight.dataWindow}</small>
  </article>;
}

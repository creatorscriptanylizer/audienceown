type FunnelRow = {
  stage: string;
  relationship_count: { display: string };
  percentage_of_total: number | null;
};

export function RecoveryFunnel({ rows }: { rows: FunnelRow[] }) {
  const labels: Record<string, string> = {
    total_audience: "Active audience",
    recovery_method_added: "Recovery method added",
    recovery_method_verified: "Method verified",
    recovery_pass_selected: "Recovery Pass selected",
    currently_recovery_ready: "Currently recovery-ready",
  };
  return <section aria-labelledby="funnel-heading"><h2 id="funnel-heading" className="text-xl font-semibold">Recovery setup funnel</h2>
    <p className="mt-2 text-sm text-zinc-400">These authoritative states do not imply a strictly sequential journey.</p>
    <ol className="mt-4 space-y-2">{rows.map((row) => <li key={row.stage} className="flex items-center justify-between rounded-xl border p-4">
      <span><strong className="block">{labels[row.stage] ?? row.stage}</strong><small className="text-zinc-500">{row.percentage_of_total === null ? "Percentage suppressed" : `${row.percentage_of_total}% of active audience`}</small></span>
      <b>{row.relationship_count.display}</b>
    </li>)}</ol>
  </section>;
}

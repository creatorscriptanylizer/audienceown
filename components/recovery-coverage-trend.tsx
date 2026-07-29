type TrendPoint = {
  snapshot_date: string;
  total_relationships: number;
  recovery_ready_relationships: number;
  recovery_coverage_rate: number;
};

export function RecoveryCoverageTrend({ rows }: { rows: TrendPoint[] }) {
  if (rows.length === 0) return <section><h2 className="text-xl font-semibold">Coverage trend</h2>
    <p className="mt-3 text-sm text-zinc-500">No daily snapshots yet. History before Stage 3.1 is unavailable.</p></section>;
  const summary = rows.map((row) =>
    `${row.snapshot_date}: ${row.recovery_coverage_rate}%`).join("; ");
  return <section aria-labelledby="trend-heading">
    <h2 id="trend-heading" className="text-xl font-semibold">Coverage trend</h2>
    <p className="sr-only">Daily coverage summary: {summary}</p>
    <div className="mt-4 flex items-end gap-2 overflow-x-auto rounded-xl border p-4" role="img" aria-label={summary}>
      {rows.map((row) => <div key={row.snapshot_date} className="flex min-w-14 flex-1 flex-col items-center gap-2">
        <span className="text-xs">{row.recovery_coverage_rate}%</span>
        <span className="w-full rounded-t bg-emerald-500/70" style={{ height: `${Math.max(4, row.recovery_coverage_rate)}px` }} />
        <small className="text-[10px] text-zinc-500">{row.snapshot_date.slice(5)}</small>
      </div>)}
    </div>
    {rows.length === 1 && <p className="mt-2 text-xs text-zinc-500">One snapshot is available; change over time is not yet measurable.</p>}
  </section>;
}

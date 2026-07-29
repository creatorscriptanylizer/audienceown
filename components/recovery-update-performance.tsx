import Link from "next/link";

type UpdateRow = {
  update_id: string;
  title: string;
  published_at: string;
  audience_snapshot_size: number;
  accepted: number;
  delivered: number;
  failed: number;
  confirmed_delivery_rate: number;
};

export function RecoveryUpdatePerformance({ rows }: { rows: UpdateRow[] }) {
  return <section aria-labelledby="updates-heading"><h2 id="updates-heading" className="text-xl font-semibold">Recent recovery broadcasts</h2>
    {rows.length === 0 ? <p className="mt-3 text-sm text-zinc-500">No recovery broadcasts yet.</p>
      : <div className="mt-4 space-y-3">{rows.map((row) => <article key={row.update_id} className="rounded-xl border p-4">
        <Link href={`/dashboard/analytics/recovery/${row.update_id}`} className="font-medium hover:underline">{row.title}</Link>
        <p className="mt-1 text-xs text-zinc-500">{new Date(row.published_at).toLocaleString()} · snapshot {row.audience_snapshot_size}</p>
        <div className="mt-4 grid grid-cols-4 gap-2 text-sm"><span>Accepted <b className="block">{row.accepted}</b></span><span>Delivered <b className="block">{row.delivered}</b></span><span>Failed <b className="block">{row.failed}</b></span><span>Confirmed rate <b className="block">{row.confirmed_delivery_rate}%</b></span></div>
      </article>)}</div>}
  </section>;
}

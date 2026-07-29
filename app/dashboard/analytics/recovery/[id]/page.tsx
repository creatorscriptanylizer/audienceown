import { notFound } from "next/navigation";
import { recoveryUpdate } from "@/lib/recovery-analytics-server";

function Breakdown({ title, values }: {
  title: string;
  values: Record<string, { display: string }>;
}) {
  return <section><h2 className="text-xl font-semibold">{title}</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">{Object.entries(values).map(([label, metric]) =>
      <article key={label} className="rounded-xl border p-4"><span className="text-sm capitalize text-zinc-400">{label.replaceAll("_", " ")}</span><strong className="mt-2 block">{metric.display}</strong></article>)}</div>
  </section>;
}

export default async function RecoveryUpdateAnalyticsPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const update = await recoveryUpdate((await params).id);
  if (!update) notFound();
  const row = update as Record<string, unknown>;
  const lifecycle = ["queued", "sending", "accepted", "delivered", "failed", "skipped", "cancelled"];
  return <div className="space-y-9">
    <section><p className="eyebrow">Recovery update analytics</p><h1 className="mt-2 text-3xl font-semibold">{String(row.title)}</h1>
      <p className="mt-3 text-sm text-zinc-400">{row.published_at ? new Date(String(row.published_at)).toLocaleString() : "Publication time unavailable"} · {String(row.broadcast_intent).replaceAll("_", " ")}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border p-4"><span className="text-xs text-zinc-500">Audience snapshot</span><strong className="mt-2 block text-2xl">{String(row.audience_snapshot_size)}</strong></article>
        <article className="rounded-xl border p-4"><span className="text-xs text-zinc-500">Confirmed delivery rate</span><strong className="mt-2 block text-2xl">{String(row.confirmed_delivery_rate)}%</strong></article>
        <article className="rounded-xl border p-4"><span className="text-xs text-zinc-500">Retryable failures</span><strong className="mt-2 block text-2xl">{String(row.retryable_failed)}</strong></article>
        <article className="rounded-xl border p-4"><span className="text-xs text-zinc-500">Permanent failures</span><strong className="mt-2 block text-2xl">{String(row.permanent_failed)}</strong></article>
      </div>
    </section>
    <section><h2 className="text-xl font-semibold">Delivery lifecycle</h2>
      <p className="mt-2 text-sm text-zinc-400">Accepted means accepted by the delivery provider. Delivered means confirmed delivered by the provider.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{lifecycle.map((status) =>
        <article key={status} className="rounded-xl border p-4"><span className="text-xs capitalize text-zinc-500">{status}</span><strong className="mt-2 block text-xl">{String(row[status] ?? 0)}</strong></article>)}</div>
    </section>
    <Breakdown title="Transport breakdown" values={row.transport_breakdown as Record<string, { display: string }>} />
    <Breakdown title="Provider-safe breakdown" values={row.provider_breakdown as Record<string, { display: string }>} />
    <section><h2 className="text-xl font-semibold">Data completeness</h2><p className="mt-2 text-sm text-zinc-400">{row.data_completeness_state === "complete" ? "Based on the original delivery snapshot for this update." : "No delivery snapshot is available for this update."}</p></section>
  </div>;
}

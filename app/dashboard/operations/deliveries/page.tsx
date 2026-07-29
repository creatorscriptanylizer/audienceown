import Link from "next/link";
import { redirect } from "next/navigation";
import { DeliveryOperationAction } from "@/components/delivery-operation-action";
import { classifyDeliveryHealth, isRetryEligible } from "@/lib/delivery-health";
import { getDeliveryOperator } from "@/lib/delivery-operator-auth";
import { getOperationsOverview } from "@/lib/delivery-operations";

function value(row: Record<string, unknown>, key: string) {
  return Number(row[key] ?? 0);
}

export default async function DeliveryOperationsPage() {
  const operator = await getDeliveryOperator();
  if (!operator) redirect("/dashboard");
  let overview;
  try {
    overview = await getOperationsOverview();
  } catch {
    return <section>
      <p className="eyebrow">Delivery operations</p>
      <h1 className="mt-2 text-3xl font-semibold">Operations unavailable</h1>
      <p className="mt-3 text-zinc-400">Health data could not be loaded safely.</p>
    </section>;
  }
  const health = overview.health as unknown as Record<string, unknown>;
  const classification = classifyDeliveryHealth({
    queuedCount: value(health, "queuedCount"),
    stuckSendingCount: value(health, "stuckSendingCount"),
    retryableFailedCount: value(health, "retryableFailedCount"),
    pendingCallbackCount: value(health, "pendingCallbackCount"),
    oldestQueuedSeconds: value(health, "oldestQueuedSeconds"),
    recentPermanentFailureRate: value(health, "recentPermanentFailureRate"),
  });
  const cards = [
    ["Queue depth", value(health, "queuedCount")],
    ["Stuck deliveries", value(health, "stuckSendingCount")],
    ["Retryable failures", value(health, "retryableFailedCount")],
    ["Pending callbacks", value(health, "pendingCallbackCount")],
    ["Acceptance rate", `${value(health, "recentAcceptanceRate")}%`],
    ["Delivery rate", `${value(health, "recentDeliveryRate")}%`],
    ["Permanent failure rate", `${value(health, "recentPermanentFailureRate")}%`],
  ];
  return <div className="space-y-10">
    <section>
      <p className="eyebrow">Delivery operations · {operator.role.replace("_", " ")}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-semibold">System health</h1>
          <p className="mt-2 text-sm text-zinc-400">One queue, exact transport routing, audited recovery actions.</p></div>
        <span className="rounded-full border px-3 py-1 text-sm capitalize">{classification}</span>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, metric]) => <article key={label} className="rounded-xl border bg-zinc-950 p-4">
          <span className="text-xs text-zinc-500">{label}</span><strong className="mt-2 block text-2xl">{metric}</strong>
        </article>)}
      </div>
    </section>

    <section><h2 className="text-xl font-semibold">Provider health</h2>
      {overview.providers.length === 0 ? <p className="mt-3 text-sm text-zinc-500">No provider activity in this window.</p>
        : <div className="mt-4 grid gap-3 xl:grid-cols-2">{overview.providers.map((provider) =>
          <article key={`${provider.provider}-${provider.transport}`} className="rounded-xl border p-4">
            <div className="flex justify-between"><strong>{provider.provider}</strong><span className="text-sm text-zinc-400">{provider.transport}</span></div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <span>Queued <b className="block">{provider.queued}</b></span>
              <span>Accepted <b className="block">{provider.accepted}</b></span>
              <span>Delivered <b className="block">{provider.delivered}</b></span>
              <span>Failed <b className="block">{provider.failed}</b></span>
              <span>Retryable <b className="block">{provider.retryable}</b></span>
              <span>Permanent <b className="block">{provider.permanent_failures}</b></span>
            </div>
          </article>)}</div>}
    </section>

    <section><h2 className="text-xl font-semibold">Recent failures</h2>
      {overview.failures.length === 0 ? <p className="mt-3 text-sm text-zinc-500">No recent failures.</p>
        : <div className="mt-4 space-y-3">{overview.failures.map((delivery) =>
          <article key={delivery.id} className="flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-center md:justify-between">
            <div><Link className="font-medium hover:underline" href={`/dashboard/operations/deliveries/${delivery.id}`}>{delivery.updateTitle}</Link>
              <p className="mt-1 text-xs text-zinc-500">{delivery.id} · {delivery.provider ?? delivery.transport}</p>
              <p className="mt-1 text-sm text-zinc-400">{delivery.failureCode ?? "Unknown failure"} · attempt {delivery.attemptCount}</p></div>
            {isRetryEligible({ status: delivery.status, attemptCount: delivery.attemptCount, failureCode: delivery.failureCode })
              && <DeliveryOperationAction action="retry" targetId={delivery.id} label="Retry delivery" />}
          </article>)}</div>}
    </section>

    <section><h2 className="text-xl font-semibold">Stuck deliveries</h2>
      {overview.stuck.length === 0 ? <p className="mt-3 text-sm text-zinc-500">No stuck deliveries.</p>
        : <div className="mt-4 space-y-3">{overview.stuck.map((delivery) =>
          <article key={delivery.id} className="flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-center md:justify-between">
            <div><Link href={`/dashboard/operations/deliveries/${delivery.id}`} className="font-medium hover:underline">{delivery.id}</Link>
              <p className="mt-1 text-sm text-zinc-400">{delivery.provider} · {delivery.transport} · {Math.round(Number(delivery.age_seconds) / 60)} minutes</p>
              <p className="text-xs text-zinc-500">{delivery.provider_message_id_present ? "Reconcile provider result before retrying" : "Safe to release if no worker remains active"}</p></div>
            {!delivery.provider_message_id_present && <DeliveryOperationAction action="release" targetId={delivery.id} label="Release delivery" />}
          </article>)}</div>}
    </section>

    <section><h2 className="text-xl font-semibold">Pending callbacks</h2>
      {overview.pending.length === 0 ? <p className="mt-3 text-sm text-zinc-500">No callbacks awaiting reconciliation.</p>
        : <div className="mt-4 space-y-3">{overview.pending.map((event) =>
          <article key={event.id} className="flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-center md:justify-between">
            <div><strong>{event.provider}</strong><p className="mt-1 text-sm text-zinc-400">{event.event_type} · {Math.round(Number(event.age_seconds) / 60)} minutes old</p></div>
            {event.provider_message_id_present && <DeliveryOperationAction action="reconcile" targetId={event.id} label="Reconcile callback" />}
          </article>)}</div>}
    </section>
  </div>;
}

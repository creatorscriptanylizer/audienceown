import { notFound, redirect } from "next/navigation";
import { DeliveryOperationAction } from "@/components/delivery-operation-action";
import { isRetryEligible, isStuckDelivery } from "@/lib/delivery-health";
import { getDeliveryOperator } from "@/lib/delivery-operator-auth";
import { getSafeDeliveryInspection } from "@/lib/delivery-operations";

function timestamp(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

export default async function DeliveryInspectionPage({
  params,
}: { params: Promise<{ id: string }> }) {
  if (!await getDeliveryOperator()) redirect("/dashboard");
  const delivery = await getSafeDeliveryInspection((await params).id);
  if (!delivery) notFound();
  const fields = [
    ["Delivery ID", delivery.id], ["Update ID", delivery.updateId],
    ["Update", delivery.updateTitle], ["Transport", delivery.transport],
    ["Provider", delivery.provider ?? "Not yet assigned"], ["Status", delivery.status],
    ["Attempt count", delivery.attemptCount], ["Failure classification", delivery.failureCode ?? "—"],
    ["Created", timestamp(delivery.createdAt)], ["Claimed", timestamp(delivery.claimedAt)],
    ["Sending", timestamp(delivery.sendingAt)], ["Accepted", timestamp(delivery.acceptedAt)],
    ["Delivered", timestamp(delivery.deliveredAt)], ["Failed", timestamp(delivery.failedAt)],
    ["Destination", delivery.maskedDestination ?? "Masked metadata unavailable"],
    ["Provider message ID", delivery.providerMessageIdPresent ? "Present" : "Absent"],
  ];
  return <div className="space-y-9">
    <section><p className="eyebrow">Delivery inspection</p><h1 className="mt-2 text-3xl font-semibold">{delivery.updateTitle}</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{fields.map(([label, value]) =>
        <article key={label} className="min-w-0 rounded-xl border p-4"><span className="text-xs text-zinc-500">{label}</span><strong className="mt-1 block break-words text-sm">{value}</strong></article>)}</div>
      <div className="mt-5 flex flex-wrap gap-3">
        {isRetryEligible({ status: delivery.status, attemptCount: delivery.attemptCount, failureCode: delivery.failureCode, providerMessageIdPresent: delivery.providerMessageIdPresent })
          && <DeliveryOperationAction action="retry" targetId={delivery.id} label="Retry delivery" />}
        {isStuckDelivery({ status: delivery.status, sendingAt: delivery.sendingAt }) && !delivery.providerMessageIdPresent
          && <DeliveryOperationAction action="release" targetId={delivery.id} label="Release stuck delivery" />}
      </div>
    </section>
    <section><h2 className="text-xl font-semibold">Provider event timeline</h2>
      {delivery.events.length === 0 ? <p className="mt-3 text-sm text-zinc-500">No provider events recorded.</p>
        : <ol className="mt-4 space-y-3">{delivery.events.map((event) => <li key={event.id} className="rounded-xl border p-4">
          <strong>{event.event_type}</strong><span className="ml-2 text-sm text-zinc-400">{event.normalized_status ?? "audit only"}</span>
          <p className="mt-1 text-xs text-zinc-500">{timestamp(event.event_timestamp ?? event.received_at)} · {event.provider} · {event.processing_status}</p>
        </li>)}</ol>}
    </section>
    <section><h2 className="text-xl font-semibold">Operator action timeline</h2>
      {delivery.actions.length === 0 ? <p className="mt-3 text-sm text-zinc-500">No operator actions recorded.</p>
        : <ol className="mt-4 space-y-3">{delivery.actions.map((action) => <li key={action.id} className="rounded-xl border p-4">
          <strong>{action.action_type.replaceAll("_", " ")}</strong><p className="mt-1 text-sm text-zinc-400">{action.reason}</p>
          <p className="mt-1 text-xs text-zinc-500">{timestamp(action.created_at)} · {action.actor_role}</p>
        </li>)}</ol>}
    </section>
  </div>;
}

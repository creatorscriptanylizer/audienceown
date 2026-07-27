import { Inbox, ShieldCheck } from "lucide-react";
import { queueUpdateDeliveries } from "@/app/dashboard/updates/actions";
import { SubmitButton } from "@/components/submit-button";

const statuses = ["queued", "sending", "sent", "delivered", "failed", "skipped", "cancelled"] as const;

export function UpdateDeliveryPanel({
  updateId,
  counts,
  canPrepare,
  queueState,
  created,
  duplicates,
}: {
  updateId: string;
  counts: Record<(typeof statuses)[number], number>;
  canPrepare: boolean;
  queueState?: string;
  created?: number;
  duplicates?: number;
}) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const queueAction = queueUpdateDeliveries.bind(null, updateId);

  return <section className="update-delivery-panel">
    <div className="update-delivery-heading">
      <span><Inbox size={20}/></span>
      <div>
        <p className="eyebrow">Delivery foundation</p>
        <h2>Audience delivery</h2>
        <p>Prepare durable recipient records before any future send attempt.</p>
      </div>
    </div>

    {queueState === "prepared" && <div className="delivery-prepared-message" role="status">
      <ShieldCheck size={17}/>
      <div>
        <strong>Delivery queue prepared. No messages have been sent.</strong>
        <p>{created ?? 0} new {created === 1 ? "recipient" : "recipients"} added{duplicates ? `; ${duplicates} already prepared` : ""}.</p>
      </div>
    </div>}
    {queueState === "incomplete" && <p className="delivery-error" role="alert">Complete the title, subject, and message before preparing the audience.</p>}
    {queueState === "unavailable" && <p className="delivery-error" role="alert">Audience preparation is available only for draft or scheduled updates.</p>}
    {queueState === "error" && <p className="delivery-error" role="alert">The delivery queue could not be prepared. Check the delivery configuration and try again.</p>}

    {total === 0
      ? <div className="delivery-empty"><p>No delivery queue has been created yet.</p><span>Preparing an audience creates records only—it does not send email.</span></div>
      : <div className="delivery-summary-grid">
        <article><span>Total</span><strong>{total}</strong></article>
        {statuses.map((status) => <article key={status}><span>{status}</span><strong>{counts[status]}</strong></article>)}
      </div>}

    {canPrepare && <div className="delivery-prepare-action">
      <div><strong>Prepare this update’s audience</strong><p>Eligibility and preferences are checked again every time. Existing recipients are never duplicated.</p></div>
      <form action={queueAction}>
        <SubmitButton className="button button-primary" pendingText="Preparing…">Prepare audience</SubmitButton>
      </form>
    </div>}
  </section>;
}

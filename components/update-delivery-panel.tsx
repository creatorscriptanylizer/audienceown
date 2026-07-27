import { Inbox } from "lucide-react";

const statuses = ["queued", "sending", "sent", "delivered", "failed", "skipped", "cancelled"] as const;
const transports = ["email", "sms", "whatsapp", "browser_notification"] as const;
const transportLabels = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
  browser_notification: "Browser notification",
} as const;

export function UpdateDeliveryPanel({
  counts,
  transportCounts,
}: {
  counts: Record<(typeof statuses)[number], number>;
  transportCounts: Record<(typeof transports)[number], number>;
}) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return <section className="update-delivery-panel">
    <div className="update-delivery-heading">
      <span><Inbox size={20}/></span>
      <div>
        <p className="eyebrow">Delivery foundation</p>
        <h2>Audience delivery</h2>
        <p>Published notifications are queued here for automatic delivery.</p>
      </div>
    </div>

    {total === 0
      ? <div className="delivery-empty"><p>Nothing has been queued yet.</p><span>Publish this draft when its real audience is ready.</span></div>
      : <div className="delivery-summary-grid">
        <article><span>Total</span><strong>{total}</strong></article>
        {statuses.map((status) => <article key={status}><span>{status}</span><strong>{counts[status]}</strong></article>)}
      </div>}

    {total > 0 && <div className="delivery-transport-breakdown">
      <p className="eyebrow">By transport</p>
      <div>{transports.map((transport) => <article key={transport}>
        <span>{transportLabels[transport]}</span><strong>{transportCounts[transport]}</strong>
      </article>)}</div>
    </div>}
  </section>;
}

import { Inbox } from "lucide-react";

const statuses = ["queued", "sending", "accepted", "delivered", "bounced", "complained", "failed", "skipped", "cancelled"] as const;
const statusLabels: Record<(typeof statuses)[number], string> = {
  queued: "Waiting to send",
  sending: "Sending",
  accepted: "Accepted by the delivery provider",
  delivered: "Confirmed delivered by the provider",
  bounced: "Bounced",
  complained: "Spam complaint",
  failed: "Could not be delivered",
  skipped: "Skipped",
  cancelled: "Cancelled",
};
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
  acceptedByTransport,
}: {
  counts: Record<(typeof statuses)[number], number>;
  transportCounts: Record<(typeof transports)[number], number>;
  acceptedByTransport: Record<(typeof transports)[number], number>;
}) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return <section className="update-delivery-panel">
    <div className="update-delivery-heading">
      <span><Inbox size={20}/></span>
      <div>
        <p className="eyebrow">Delivery foundation</p>
        <h2>Audience delivery</h2>
        <p>Provider acceptance and final delivery outcomes are tracked separately.</p>
      </div>
    </div>

    {total === 0
      ? <div className="delivery-empty"><p>Nothing has been queued yet.</p><span>Publish this draft when its real audience is ready.</span></div>
      : <div className="delivery-summary-grid">
        <article><span>Total</span><strong>{total}</strong></article>
        {statuses.map((status) => <article key={status}><span>{statusLabels[status]}</span><strong>{counts[status]}</strong></article>)}
      </div>}

    {total > 0 && <div className="delivery-transport-breakdown">
      <p className="eyebrow">By transport</p>
      <div>{transports.map((transport) => <article key={transport}>
        <span>{transportLabels[transport]}</span><strong>{transportCounts[transport]}</strong>
        {acceptedByTransport[transport] > 0 && <small>
          {transport === "browser_notification"
            ? `${acceptedByTransport[transport]} accepted by browser push service`
            : transport === "email"
              ? `${acceptedByTransport[transport]} accepted by email provider`
              : transport === "sms"
                ? `${acceptedByTransport[transport]} accepted by SMS provider`
              : `${acceptedByTransport[transport]} accepted by WhatsApp provider`}
        </small>}
      </article>)}</div>
    </div>}
  </section>;
}

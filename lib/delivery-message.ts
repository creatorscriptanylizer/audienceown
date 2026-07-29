import type { DeliveryMessage } from "@/lib/delivery-providers/types";
import type { DeliveryTransport } from "@/lib/update-recipients";

export type ClaimedDelivery = {
  delivery_id: string;
  update_id: string;
  creator_id: string;
  transport: DeliveryTransport;
  destination: string;
  attempt_count: number;
  broadcast_type: string;
  title: string;
  subject: string;
  preview_text: string;
  content: string;
  cta_label: string | null;
  cta_url: string | null;
  creator_display_name: string;
  creator_public_slug: string;
};

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildDeliveryMessage(
  delivery: ClaimedDelivery,
  appUrl: string,
): DeliveryMessage {
  const creatorUrl = `${appUrl.replace(/\/$/, "")}/c/${encodeURIComponent(delivery.creator_public_slug)}`;
  const text = [
    delivery.content,
    delivery.cta_label && delivery.cta_url ? `${delivery.cta_label}: ${delivery.cta_url}` : null,
    `Creator page: ${creatorUrl}`,
    `Sent by ${delivery.creator_display_name} through AudienceOwn.`,
  ].filter(Boolean).join("\n\n");
  const html = [
    `<p>${escapeHtml(delivery.content).replaceAll("\n", "<br>")}</p>`,
    delivery.cta_label && delivery.cta_url
      ? `<p><a href="${escapeHtml(delivery.cta_url)}">${escapeHtml(delivery.cta_label)}</a></p>`
      : "",
    `<p><a href="${escapeHtml(creatorUrl)}">Visit ${escapeHtml(delivery.creator_display_name)}’s creator page</a></p>`,
    `<p>Sent by ${escapeHtml(delivery.creator_display_name)} through AudienceOwn.</p>`,
  ].join("");

  return {
    deliveryId: delivery.delivery_id,
    transport: delivery.transport,
    destination: delivery.destination,
    subject: delivery.subject,
    title: delivery.title,
    text,
    html,
    notificationUrl: creatorUrl,
    statusCallbackUrl: delivery.transport === "whatsapp"
      ? `${appUrl.replace(/\/$/, "")}/api/webhooks/whatsapp/twilio`
      : `${appUrl.replace(/\/$/, "")}/api/webhooks/sms/twilio`,
    metadata: {
      updateId: delivery.update_id,
      creatorId: delivery.creator_id,
      creatorHandle: delivery.creator_public_slug,
      creatorName: delivery.creator_display_name,
    },
  };
}

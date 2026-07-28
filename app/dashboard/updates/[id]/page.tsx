import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { BroadcastStudio } from "@/components/broadcast-studio/broadcast-studio";
import { UpdateDeliveryPanel } from "@/components/update-delivery-panel";
import { LocalDateTime } from "@/components/local-date-time";
import { CancelScheduledButton } from "@/components/cancel-scheduled-button";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { getEligibleRecipientsForUpdate } from "@/lib/update-delivery";

const deliveryStatuses = ["queued", "sending", "accepted", "delivered", "bounced", "complained", "failed", "skipped", "cancelled"] as const;
const deliveryTransports = ["email", "sms", "whatsapp", "browser_notification"] as const;

function safeCount(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && /^\d+$/.test(candidate) ? Number(candidate) : undefined;
}

export default async function UpdatePage({ params, searchParams }: PageProps<"/dashboard/updates/[id]">) {
  const creator = await requireCreator();
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data: update } = await supabase.from("creator_updates").select(
    "id,broadcast_type,broadcast_intent,affected_platform_connection_id,status,title,subject,preview_text,content,cta_label,cta_url,scheduled_for",
  ).eq("id", id).eq("creator_id", creator.id).maybeSingle();
  if (!update) notFound();
  const { data: accounts } = await supabase.from("connected_accounts")
    .select("id,platform,account_type,label,url,is_primary,is_public,position")
    .eq("creator_id", creator.id).order("position");
  let estimate = null;
  try {
    const resolution = await getEligibleRecipientsForUpdate(id, creator.id);
    estimate = {
      eligible: resolution.eligible,
      duplicates: resolution.duplicates,
      excluded: resolution.excluded as Record<string, number>,
      byTransport: resolution.byTransport,
    };
  } catch {
    estimate = null;
  }
  const { data: deliveries } = await supabase.from("update_deliveries").select("status,transport")
    .eq("update_id", id).eq("creator_id", creator.id);
  const counts = Object.fromEntries(deliveryStatuses.map((status) => [
    status,
    (deliveries ?? []).filter((delivery) => delivery.status === status).length,
  ])) as Record<(typeof deliveryStatuses)[number], number>;
  const transportCounts = Object.fromEntries(deliveryTransports.map((transport) => [
    transport,
    (deliveries ?? []).filter((delivery) => delivery.transport === transport).length,
  ])) as Record<(typeof deliveryTransports)[number], number>;
  const acceptedByTransport = Object.fromEntries(deliveryTransports.map((transport) => [
    transport,
    (deliveries ?? []).filter((delivery) =>
      delivery.transport === transport && delivery.status === "accepted").length,
  ])) as Record<(typeof deliveryTransports)[number], number>;
  return <>
    <Link href="/dashboard/updates" className="update-back-link"><ArrowLeft size={15}/> Update history</Link>
    {query.status === "published" && query.updateId === id && <section className="studio-publish-result" role="status">
      <p className="eyebrow">Published</p>
      <h2>{update.broadcast_type === "account_update" ? "Recovery alert published" : "Broadcast published"}</h2>
      <p>{safeCount(query.queued) ?? 0} notifications were queued from {safeCount(query.eligible) ?? 0} eligible followers. AudienceOwn will begin delivery automatically.</p>
      <div><span>Email {safeCount(query.email) ?? 0}</span><span>SMS {safeCount(query.sms) ?? 0}</span><span>WhatsApp {safeCount(query.whatsapp) ?? 0}</span><span>Browser {safeCount(query.browser_notification) ?? 0}</span></div>
    </section>}
    {query.status === "scheduled" && query.updateId === id && query.scheduledFor && <section className="studio-publish-result" role="status">
      <p className="eyebrow">Scheduled</p>
      <h2>{safeCount(query.queued) ?? 0} notifications were prepared.</h2>
      <p>This update will become eligible for delivery on:</p>
      <p className="local-scheduled-time"><strong><LocalDateTime value={Array.isArray(query.scheduledFor) ? query.scheduledFor[0] : query.scheduledFor} timeZone={Array.isArray(query.timeZone) ? query.timeZone[0] : query.timeZone}/></strong></p>
      <div><span>Email {safeCount(query.email) ?? 0}</span><span>SMS {safeCount(query.sms) ?? 0}</span><span>WhatsApp {safeCount(query.whatsapp) ?? 0}</span><span>Browser {safeCount(query.browser_notification) ?? 0}</span></div>
    </section>}
    {update.status === "scheduled" && update.scheduled_for ? <section className="studio-publish-result">
      <p className="eyebrow">Scheduled broadcast</p>
      <h2>{update.title}</h2>
      <p className="local-scheduled-time"><LocalDateTime value={update.scheduled_for}/></p>
      <p>{deliveries?.length ?? 0} recipient notifications are prepared as a fixed audience snapshot. Content and targeting are locked.</p>
      <CancelScheduledButton updateId={id}/>
    </section> : <BroadcastStudio
      update={update}
      creator={{ displayName: creator.display_name, publicSlug: creator.public_slug }}
      accounts={accounts ?? []}
      estimate={estimate}
    />}
    <UpdateDeliveryPanel
      counts={counts}
      transportCounts={transportCounts}
      acceptedByTransport={acceptedByTransport}
    />
  </>;
}

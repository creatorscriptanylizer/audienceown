import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { BroadcastStudio } from "@/components/broadcast-studio/broadcast-studio";
import { UpdateDeliveryPanel } from "@/components/update-delivery-panel";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { updatePublishSchema } from "@/lib/updates";
import { getEligibleRecipientsForUpdate } from "@/lib/update-delivery";

const deliveryStatuses = ["queued", "sending", "sent", "delivered", "failed", "skipped", "cancelled"] as const;
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
  const publishable = updatePublishSchema.safeParse({
    broadcast_type: update.broadcast_type,
    title: update.title,
    subject: update.subject,
    preview_text: update.preview_text,
    content: update.content,
    cta_label: update.cta_label ?? "",
    cta_url: update.cta_url ?? "",
  }).success;

  return <>
    <Link href="/dashboard/updates" className="update-back-link"><ArrowLeft size={15}/> Update history</Link>
    {query.published === "1" && <section className="studio-publish-result" role="status">
      <p className="eyebrow">Audience prepared</p>
      <h2>{update.broadcast_type === "account_update" ? "Recovery alert published" : "Broadcast published"}</h2>
      <p>{safeCount(query.created) ?? 0} deliveries queued from {safeCount(query.eligible) ?? 0} eligible followers. Nothing is marked sent until the delivery worker confirms it.</p>
      <div><span>Email {safeCount(query.email) ?? 0}</span><span>SMS {safeCount(query.sms) ?? 0}</span><span>WhatsApp {safeCount(query.whatsapp) ?? 0}</span><span>Browser {safeCount(query.browser_notification) ?? 0}</span></div>
    </section>}
    <BroadcastStudio
      update={update}
      creator={{ displayName: creator.display_name, publicSlug: creator.public_slug }}
      accounts={accounts ?? []}
      estimate={estimate}
    />
    <UpdateDeliveryPanel
      updateId={id}
      counts={counts}
      transportCounts={transportCounts}
      canPrepare={publishable && (update.status === "draft" || update.status === "scheduled")}
      queueState={Array.isArray(query.queue) ? query.queue[0] : query.queue}
      created={safeCount(query.created)}
      duplicates={safeCount(query.duplicates)}
    />
  </>;
}

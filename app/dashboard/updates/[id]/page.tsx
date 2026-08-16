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
import { AiDraftPanel } from "@/components/ai-draft-panel";
import { UnavailableState } from "@/components/product-state";
import { logPageQueryFailure } from "@/lib/data-availability";

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
  if (!supabase) return <UnavailableState title="Update unavailable" description="We could not load this update right now. Your saved update was not changed."/>;
  const updateResult = await supabase.from("creator_updates").select(
    "id,broadcast_type,broadcast_intent,affected_platform_connection_id,status,title,subject,preview_text,content,cta_label,cta_url,scheduled_for,deterministic_title,deterministic_content",
  ).eq("id", id).eq("creator_id", creator.id).maybeSingle();
  if (updateResult.error) {
    logPageQueryFailure("dashboard/updates/[id]", "creator_updates", updateResult.error);
    return <UnavailableState title="Update unavailable" description="We could not load this update right now. Your saved update was not changed."/>;
  }
  const update = updateResult.data;
  if (!update) notFound();
  const [accountsResult, estimateResult, deliveriesResult, aiJobsResult, aiVariantsResult] = await Promise.all([
    supabase.from("connected_accounts").select("id,platform,account_type,label,url,is_primary,is_public,position").eq("creator_id", creator.id).order("position"),
    getEligibleRecipientsForUpdate(id, creator.id).then((resolution) => ({ data: { eligible: resolution.eligible, duplicates: resolution.duplicates, excluded: resolution.excluded as Record<string, number>, byTransport: resolution.byTransport }, error: null })).catch((error: unknown) => ({ data: null, error })),
    supabase.from("update_deliveries").select("status,transport").eq("update_id", id).eq("creator_id", creator.id),
    supabase.from("ai_draft_enhancement_jobs").select("id,status,prompt_version,stale_result,last_error_code").eq("creator_update_id",id).order("created_at",{ascending:false}),
    supabase.from("ai_draft_variants").select("id,variant_type,title,body,provider,model,prompt_version,selected").eq("creator_update_id",id).order("created_at"),
  ]);
  for (const [queryName, error] of [["connected_accounts", accountsResult.error], ["eligible_recipients", estimateResult.error], ["update_deliveries", deliveriesResult.error], ["ai_draft_enhancement_jobs", aiJobsResult.error], ["ai_draft_variants", aiVariantsResult.error]] as const) logPageQueryFailure("dashboard/updates/[id]", queryName, error);
  const deliveries = deliveriesResult.data ?? [];
  const counts = Object.fromEntries(deliveryStatuses.map((status) => [
    status,
    deliveries.filter((delivery) => delivery.status === status).length,
  ])) as Record<(typeof deliveryStatuses)[number], number>;
  const transportCounts = Object.fromEntries(deliveryTransports.map((transport) => [
    transport,
    deliveries.filter((delivery) => delivery.transport === transport).length,
  ])) as Record<(typeof deliveryTransports)[number], number>;
  const acceptedByTransport = Object.fromEntries(deliveryTransports.map((transport) => [
    transport,
    deliveries.filter((delivery) =>
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
      <p>{deliveriesResult.error ? <>— recipient notifications prepared. Delivery data is unavailable.</> : <>{deliveries.length} recipient notifications are prepared as a fixed audience snapshot. Content and targeting are locked.</>}</p>
      <CancelScheduledButton updateId={id}/>
    </section> : <>{aiJobsResult.error || aiVariantsResult.error ? <UnavailableState compact title="AI draft history unavailable" description="Draft enhancement history could not be loaded. Your update remains available."/> : <AiDraftPanel updateId={id} status={update.status} original={{title:update.deterministic_title,body:update.deterministic_content}}
      jobs={aiJobsResult.data??[]} variants={aiVariantsResult.data??[]}/>}<BroadcastStudio
      update={update}
      creator={{ displayName: creator.display_name, publicSlug: creator.public_slug ?? "" }}
      accounts={accountsResult.data ?? []}
      accountsAvailable={!accountsResult.error}
      estimate={estimateResult.data}
    /></>}
    {deliveriesResult.error ? <UnavailableState title="Delivery data unavailable" description="Delivery counts could not be established right now. Tracking availability has not changed."/> : <UpdateDeliveryPanel
      counts={counts}
      transportCounts={transportCounts}
      acceptedByTransport={acceptedByTransport}
    />}
  </>;
}

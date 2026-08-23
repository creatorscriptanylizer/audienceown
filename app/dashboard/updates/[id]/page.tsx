import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { AlertComposer } from "@/components/broadcast-studio/broadcast-studio";
import { UpdateDeliveryPanel } from "@/components/update-delivery-panel";
import { LocalDateTime } from "@/components/local-date-time";
import { CancelScheduledButton } from "@/components/cancel-scheduled-button";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { AiDraftPanel } from "@/components/ai-draft-panel";
import { UnavailableState } from "@/components/product-state";
import { logPageQueryFailure } from "@/lib/data-availability";
import { getAlertComposerDefinition } from "@/lib/broadcast-studio";

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
    "id,broadcast_type,broadcast_intent,affected_platform_connection_id,status,title,subject,preview_text,content,cta_label,cta_url,scheduled_for,deterministic_title,deterministic_content,source_metadata",
  ).eq("id", id).eq("creator_id", creator.id).maybeSingle();
  if (updateResult.error) {
    logPageQueryFailure("dashboard/updates/[id]", "creator_updates", updateResult.error);
    return <UnavailableState title="Update unavailable" description="We could not load this update right now. Your saved update was not changed."/>;
  }
  const update = updateResult.data;
  if (!update) notFound();
  const [accountsResult, networksResult, publishingAccountsResult, recoveryDestinationsResult, deliveriesResult, aiJobsResult, aiVariantsResult] = await Promise.all([
    supabase.from("connected_accounts").select("id,platform,account_type,label,url,is_primary,is_public,position,external_account_id,connection_health,provider_status").eq("creator_id", creator.id).order("position"),
    supabase.from("recovery_networks").select("main_connected_account_id,recovery_network_destinations(recovery_connected_account_id)").eq("creator_id",creator.id),
    supabase.from("creator_update_publishing_accounts").select("connected_account_reference,provider_snapshot,account_display_snapshot,role_snapshot,targeting_rule_snapshot").eq("update_id", id),
    supabase.from("creator_update_recovery_destinations").select("connected_account_id").eq("update_id",id).eq("creator_id",creator.id).order("created_at"),
    supabase.from("update_deliveries").select("status,transport").eq("update_id", id).eq("creator_id", creator.id),
    supabase.from("ai_draft_enhancement_jobs").select("id,status,prompt_version,stale_result,last_error_code").eq("creator_update_id",id).order("created_at",{ascending:false}),
    supabase.from("ai_draft_variants").select("id,variant_type,title,body,provider,model,prompt_version,selected").eq("creator_update_id",id).order("created_at"),
  ]);
  const recoveryRelationships=(networksResult.data??[]).flatMap(network=>network.main_connected_account_id?network.recovery_network_destinations.map(link=>({main_connected_account_id:network.main_connected_account_id!,recovery_connected_account_id:link.recovery_connected_account_id})):[]);
  for (const [queryName, error] of [["connected_accounts", accountsResult.error], ["publishing_accounts", publishingAccountsResult.error], ["recovery_destinations",recoveryDestinationsResult.error], ["update_deliveries", deliveriesResult.error], ["ai_draft_enhancement_jobs", aiJobsResult.error], ["ai_draft_variants", aiVariantsResult.error]] as const) logPageQueryFailure("dashboard/updates/[id]", queryName, error);
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
    {update.broadcast_intent === "new_video" && <section className="studio-publish-result" aria-labelledby="update-detail-heading">
      <p className="eyebrow">Update</p>
      <h2 id="update-detail-heading">New video</h2>
      <div className="studio-review-list">
        {(publishingAccountsResult.data ?? []).map((account) => <div key={account.connected_account_reference}>
          <dt>{account.provider_snapshot} · {account.account_display_snapshot}</dt>
          <dd>{account.role_snapshot === "main" ? "Main account · Publishing context" : "Recovery · Publishing context"}</dd>
        </div>)}
        <div><dt>Message</dt><dd>{update.content}</dd></div>
        <div><dt>Destination</dt><dd>{update.cta_url ?? "—"}</dd></div>
        <div><dt>Schedule / status</dt><dd>{update.scheduled_for ? <LocalDateTime value={update.scheduled_for}/> : update.status}</dd></div>
        <div><dt>Audience</dt><dd>{deliveriesResult.error ? "Audience calculation unavailable" : deliveries.length ? `${deliveries.length} stored recipient deliveries` : "Pending"}</dd></div>
      </div>
    </section>}
    {query.status === "published" && query.updateId === id && <section className="studio-publish-result" role="status">
      <p className="eyebrow">Published</p>
      <h2>{update.broadcast_type === "account_update" ? "Recovery alert published" : "Broadcast published"}</h2>
      <p>{safeCount(query.queued) ?? 0} notifications were queued from {safeCount(query.eligible) ?? 0} eligible followers. AudienceOwn will begin delivery automatically.</p>
      <div><span>Email {safeCount(query.email) ?? 0}</span><span>SMS {safeCount(query.sms) ?? 0}</span><span>WhatsApp {safeCount(query.whatsapp) ?? 0}</span><span>Browser {safeCount(query.browser_notification) ?? 0}</span></div>
    </section>}
    {query.status === "scheduled" && query.updateId === id && query.scheduledFor && <section className="studio-publish-result" role="status">
      <p className="eyebrow">Scheduled</p>
      <h2>{getAlertComposerDefinition(update.broadcast_intent).scheduleLabel.replace(/^Schedule /, "")} scheduled</h2>
      <p>{safeCount(query.queued) ?? 0} notifications were prepared for:</p>
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
      jobs={aiJobsResult.data??[]} variants={aiVariantsResult.data??[]}/>}<AlertComposer
      update={{...update, recovery_situation: typeof update.source_metadata === "object" && update.source_metadata && !Array.isArray(update.source_metadata) && typeof update.source_metadata.recovery_situation === "string" ? update.source_metadata.recovery_situation as import("@/lib/recovery-communication").RecoverySituation : undefined, publishing_account_ids: (publishingAccountsResult.data ?? []).map((row) => row.connected_account_reference), recovery_destination_ids:(recoveryDestinationsResult.data??[]).map((row)=>row.connected_account_id)}}
      initialReview={query.review === "1"}
      creator={{ displayName: creator.display_name, publicSlug: creator.public_slug ?? "" }}
      accounts={accountsResult.data ?? []}
      recoveryRelationships={recoveryRelationships}
      accountsAvailable={!accountsResult.error}
      estimate={deliveries.length ? { eligible: deliveries.length, duplicates: 0, excluded: {}, byTransport: transportCounts } : null}
      debugEmergencySend={process.env.NODE_ENV !== "production" && process.env.AUDIENCEOWN_DEBUG === "1"}
    /></>}
    {deliveriesResult.error ? <UnavailableState title="Delivery data unavailable" description="Delivery counts could not be established right now. Tracking availability has not changed."/> : <UpdateDeliveryPanel
      counts={counts}
      transportCounts={transportCounts}
      acceptedByTransport={acceptedByTransport}
    />}
  </>;
}

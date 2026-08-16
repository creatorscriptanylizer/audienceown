import { PlatformsManager } from "@/components/platforms-manager";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { YouTubeAutomationPanel } from "@/components/youtube-automation-panel";
import { SocialProviderGrid } from "@/components/social-provider-grid";
import { listSocialProviders } from "@/lib/social-providers/registry";
import { ProviderExpansionSummary } from "@/components/providers/provider-expansion-summary";
import { ProviderExpansionTwoSummary } from "@/components/providers/provider-expansion-two-summary";
import { MetaAssetSelection } from "@/components/providers/meta-asset-selection";
import { DiscordGuildSelection } from "@/components/providers/discord-guild-selection";
import { getSocialProvider } from "@/lib/social-providers/registry";
import { providerReadiness } from "@/lib/social-providers/readiness";
import type { ProviderAccessLevel } from "@/lib/social-providers/types";
import { ProviderExpansionThreeSummary } from "@/components/providers/provider-expansion-three-summary";
import { ProviderExpansionFourSummary } from "@/components/providers/provider-expansion-four-summary";
import { getCreatorProviderAccounts } from "@/lib/social-providers/creator-provider-accounts";
import { providerConnectionCapability } from "@/lib/social-providers/connection-capabilities";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/dal";
import { YouTubeChannelSelection, type YouTubeChannelChoice } from "@/components/youtube-channel-selection";
import type { YouTubeChannelIdentity } from "@/lib/youtube-watcher";
import { getCreatorEntitlements } from "@/lib/provider-entitlements";
import { UnavailableState } from "@/components/product-state";
import { logPageQueryFailure } from "@/lib/data-availability";

function accessLevel(value:string|null|undefined,fallback:ProviderAccessLevel):ProviderAccessLevel{return value==="none"||value==="development"||value==="standard"||value==="advanced"||value==="approved"?value:fallback;}

export default async function Page({ searchParams }: PageProps<"/dashboard/platforms">) {
  const creator = await requireCreator();
  const viewer=await getViewer();
  const entitlementsResult=await getCreatorEntitlements(creator.id,viewer).then(data=>({data,error:null})).catch(error=>({data:null,error}));
  logPageQueryFailure("platforms","entitlements",entitlementsResult.error);
  const entitlements=entitlementsResult.data;
  const supabase = (await createClient())!;
  const params = await searchParams;
  let youtubeSelection: { id: string; role: "official" | "backup"; channels: YouTubeChannelChoice[] } | null = null;
  if (params.youtube === "select_channel" && typeof params.pendingSelectionId === "string" && /^[0-9a-f-]{36}$/i.test(params.pendingSelectionId)) {
    const [viewer, admin] = await Promise.all([getViewer(), Promise.resolve(createAdminClient())]);
    if (viewer && admin) {
      const pending = await admin.from("youtube_oauth_pending_selections").select("id,requested_role,eligible_channels,expires_at,consumed_at")
        .eq("id", params.pendingSelectionId).eq("creator_id", creator.id).eq("user_id", viewer.id).maybeSingle();
      if (pending.data && !pending.data.consumed_at && pending.data.expires_at > new Date().toISOString()
        && (pending.data.requested_role === "official" || pending.data.requested_role === "backup") && Array.isArray(pending.data.eligible_channels)) {
        const eligible = pending.data.eligible_channels as unknown as YouTubeChannelIdentity[];
        const ids = eligible.map((channel) => channel.id);
        const existing = ids.length ? await admin.from("connected_accounts").select("external_account_id,account_type")
          .eq("creator_id", creator.id).eq("platform", "youtube").in("external_account_id", ids) : { data: [] };
        youtubeSelection = { id: pending.data.id, role: pending.data.requested_role, channels: eligible.map((channel) => ({
          id: channel.id, title: channel.title, subscriberCount: channel.subscriberCount,
          hiddenSubscriberCount: channel.hiddenSubscriberCount,
          connectedRole: existing.data?.find((account) => account.external_account_id === channel.id)?.account_type === "official" ? "official"
            : existing.data?.find((account) => account.external_account_id === channel.id)?.account_type === "backup" ? "backup" : null,
        })) };
      }
    }
  }
  const [providerAccountResult, socialConnectionsResult, youtubeResult, activityResult, draftsResult, accessReviewsResult, manualServicesResult, audienceMetricsResult] = await Promise.all([
    getCreatorProviderAccounts(supabase, creator.id).then(data=>({data,error:null})).catch(error=>({data:null,error})),
    supabase.from("connected_accounts").select("id,platform,external_account_name,connection_health,provider_status,watch_enabled,auto_send,webhook_enabled,last_sync_at,granted_scopes")
      .eq("creator_id", creator.id).in("platform",listSocialProviders().map((provider)=>provider.provider)),
    supabase.from("connected_accounts").select("id,external_account_name,url,watch_enabled,auto_create_drafts,auto_send,last_sync_at,connection_health,last_connection_error")
      .eq("creator_id", creator.id).eq("platform", "youtube").eq("account_type", "official").eq("is_primary", true).not("external_account_id", "is", null).limit(1).maybeSingle(),
    supabase.from("creator_activity").select("id,title,body,created_at,creator_update_id")
      .eq("creator_id", creator.id).order("created_at", { ascending: false }).limit(8),
    supabase.from("creator_updates").select("id,title,updated_at")
      .eq("creator_id", creator.id).eq("source_provider", "youtube").eq("status", "draft")
      .order("updated_at", { ascending: false }).limit(8),
    supabase.from("provider_access_reviews").select("provider,capability,status,access_level,expires_at"),
    supabase.from("manual_service_connections").select("id,service_name,service_category,canonical_url,verification_status,verification_method,public_visible,official").eq("creator_id",creator.id).is("archived_at",null),
    supabase.from("provider_audience_metrics").select("connection_id,audience_count,audience_unit,status").eq("creator_id",creator.id),
  ]);
  logPageQueryFailure("platforms","provider_accounts",providerAccountResult.error);
  [["social_connections",socialConnectionsResult.error],["youtube",youtubeResult.error],["activity",activityResult.error],["drafts",draftsResult.error],["access_reviews",accessReviewsResult.error],["manual_services",manualServicesResult.error],["audience_metrics",audienceMetricsResult.error]].forEach(([name,error])=>logPageQueryFailure("platforms",String(name),error));
  const {data:socialConnections}=socialConnectionsResult,{data:youtube}=youtubeResult,{data:activity}=activityResult,{data:drafts}=draftsResult,{data:accessReviews}=accessReviewsResult,{data:manualServices}=manualServicesResult,{data:audienceMetrics}=audienceMetricsResult;
  if(!providerAccountResult.data)return <><header className="platforms-page-header"><p className="eyebrow">Your presence</p><h1>Platforms</h1><p>Manage your official and backup accounts so fans always know where to find you.</p></header><UnavailableState title="Platforms unavailable" description="Connected accounts could not be loaded. No platform state was changed."/></>;
  const {configuredConnections,assets:providerAssets,accounts:accountProjection}=providerAccountResult.data;
  const accounts=configuredConnections.map((account)=>{const metric=audienceMetrics?.find(item=>item.connection_id===account.id&&item.status==="available");return{...account,audience_count:metric?.audience_count===null||metric?.audience_count===undefined?null:Number(metric.audience_count),audience_unit:metric?.audience_unit??null,audience_unavailable:Boolean(audienceMetricsResult.error)};});
  const expansionTwoReadiness=Object.fromEntries((["tiktok","instagram","facebook"]as const).map(provider=>{const base=providerReadiness(getSocialProvider(provider)),grantedScopes=[...new Set((socialConnections??[]).filter(connection=>connection.platform===provider).flatMap(connection=>connection.granted_scopes))],missingScopes=base.requiredScopes.filter(scope=>!grantedScopes.includes(scope)),stored=(accessReviews??[]).filter(review=>review.provider===provider&&(!review.expires_at||review.expires_at>new Date().toISOString())).at(-1),reviewStatus=stored?.status==="approved"?"approved":stored?.status==="submitted"?"submitted":stored?.status==="restricted"?"restricted":stored?.status==="rejected"?"rejected":stored?.status==="review_required"?"required":base.reviewStatus;return[provider,{...base,grantedScopes,missingScopes,reviewStatus,accessLevel:accessLevel(stored?.access_level,base.accessLevel),contentDetectionAvailable:base.contentDetectionAvailable&&missingScopes.length===0}];}));
  const metaConnectionId=socialConnections?.find(connection=>connection.platform==="facebook"&&connection.provider_status==="asset_selection_required")?.id;
  const discordConnectionId=socialConnections?.find(connection=>connection.platform==="discord"&&["asset_selection_required","public_invite_required"].includes(connection.provider_status))?.id;
  const expansionThreeReadiness=Object.fromEntries((["x","linkedin"]as const).map(provider=>[provider,providerReadiness(getSocialProvider(provider))]));
  const expansionFourReadiness=Object.fromEntries((["spotify","snapchat","pinterest"]as const).map(provider=>[provider,providerReadiness(getSocialProvider(provider))]));

  return <>
    <header className="platforms-page-header">
      <p className="eyebrow">Your presence</p>
      <h1>Platforms</h1>
      <p>Manage your official and backup accounts so fans always know where to find you.</p>
    </header>
    {!entitlements?<UnavailableState compact title="Platform limits unavailable" description="Connected accounts are visible below, but account changes are unavailable until plan limits can be established."/>:<PlatformsManager accounts={accounts ?? []} entitlements={entitlements} connectionCapabilities={listSocialProviders().map((adapter) =>
      providerConnectionCapability(adapter, providerReadiness(adapter).connectionAvailable))}/>
    }
    {youtubeSelection && <YouTubeChannelSelection pendingSelectionId={youtubeSelection.id} role={youtubeSelection.role} channels={youtubeSelection.channels}/>}
    {socialConnectionsResult.error?<UnavailableState compact title="Connection status unavailable" description="Provider connection status could not be loaded."/>:<SocialProviderGrid providers={listSocialProviders().map(({provider,displayName,availability,unavailableReason,capabilities})=>({
      provider,displayName,availability,unavailableReason,capabilities}))} connections={socialConnections ?? []} accountProjection={accountProjection}/>
    }
    <ProviderExpansionSummary/>
    {accessReviewsResult.error||socialConnectionsResult.error?<UnavailableState compact title="Provider readiness unavailable" description="Provider access and readiness status could not be established."/>:<ProviderExpansionTwoSummary readiness={expansionTwoReadiness} assets={providerAssets??[]} metaConnectionId={metaConnectionId}/>}
    {metaConnectionId&&<MetaAssetSelection connectionId={metaConnectionId}/>}
    {discordConnectionId&&<DiscordGuildSelection connectionId={discordConnectionId}/>}
    {socialConnectionsResult.error?<UnavailableState compact title="Provider connection details unavailable" description="X and LinkedIn connection status could not be loaded."/>:<ProviderExpansionThreeSummary readiness={expansionThreeReadiness} connections={(socialConnections??[]).filter(connection=>["x","linkedin"].includes(connection.platform))}/>}
    {manualServicesResult.error||socialConnectionsResult.error?<UnavailableState compact title="Extended provider status unavailable" description="Manual service and provider state could not be loaded."/>:<ProviderExpansionFourSummary readiness={expansionFourReadiness} connections={(socialConnections??[]).filter(connection=>["spotify","snapchat","pinterest"].includes(connection.platform))} manualServices={manualServices??[]}/>}
    {youtubeResult.error||activityResult.error||draftsResult.error?<UnavailableState compact title="YouTube automation unavailable" description="YouTube connection or automation activity could not be loaded."/>:<YouTubeAutomationPanel connection={youtube} activity={activity ?? []} drafts={drafts ?? []}
      status={typeof params.youtube === "string" ? params.youtube : undefined}/>
    }
  </>;
}

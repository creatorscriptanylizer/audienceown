import { PlatformsManager } from "@/components/platforms-manager";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { listSocialProviders } from "@/lib/social-providers/registry";
import { MetaAssetSelection } from "@/components/providers/meta-asset-selection";
import { DiscordGuildSelection } from "@/components/providers/discord-guild-selection";
import { providerReadiness } from "@/lib/social-providers/readiness";
import { getCreatorProviderAccounts } from "@/lib/social-providers/creator-provider-accounts";
import { providerConnectionCapability } from "@/lib/social-providers/connection-capabilities";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/dal";
import { YouTubeChannelSelection, type YouTubeChannelChoice } from "@/components/youtube-channel-selection";
import type { YouTubeChannelIdentity } from "@/lib/youtube-watcher";
import { getCreatorEntitlements } from "@/lib/provider-entitlements";
import { UnavailableState } from "@/components/product-state";
import { logPageQueryFailure } from "@/lib/data-availability";
import { calculateRecoveryReadiness } from "@/lib/recovery-readiness";
import {derivePlatformContextEvent,type CanonicalPlatformAccount} from "@/lib/intelligence/platform-context-event";
import {PlatformContextBanner} from "@/components/platform-context-banner";

export default async function Page({ searchParams }: PageProps<"/dashboard/platforms">) {
  const creator = await requireCreator();
  const viewer=await getViewer();
  const entitlementsResult=await getCreatorEntitlements(creator.id,viewer).then(data=>({data,error:null})).catch(error=>({data:null,error}));
  logPageQueryFailure("platforms","entitlements",entitlementsResult.error);
  const entitlements=entitlementsResult.data;
  const supabase = (await createClient())!;
  const params = await searchParams;
  const recoveryConnectStatus=typeof params.youtube==="string"?params.youtube:typeof params.social==="string"?params.social.split(":").at(-1):null;
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
  const [providerAccountResult, networksResult, connectionSelectionsResult, audienceMetricsResult, identityAccountsResult, plansResult] = await Promise.all([
    getCreatorProviderAccounts(supabase, creator.id).then(data=>({data,error:null})).catch(error=>({data:null,error})),
    supabase.from("recovery_networks").select("id,main_connected_account_id,position,recovery_network_destinations(recovery_connected_account_id)").eq("creator_id",creator.id).order("position"),
    supabase.from("connected_accounts").select("id,platform,provider_status").eq("creator_id",creator.id).in("platform",["facebook","discord"]),
    supabase.from("provider_audience_metrics").select("connection_id,audience_count,audience_unit,status").eq("creator_id",creator.id),
    supabase.from("creator_identity_accounts").select("official,account_kind,verification_status").eq("creator_id",creator.id),
    supabase.from("emergency_plans").select("readiness_status").eq("creator_id",creator.id).order("updated_at",{ascending:false}).limit(1),
  ]);
  logPageQueryFailure("platforms","provider_accounts",providerAccountResult.error);
  [["recovery_networks",networksResult.error],["connection_selections",connectionSelectionsResult.error],["audience_metrics",audienceMetricsResult.error],["identity_accounts",identityAccountsResult.error],["emergency_plans",plansResult.error]].forEach(([name,error])=>logPageQueryFailure("platforms",String(name),error));
  const {data:connectionSelections}=connectionSelectionsResult,{data:audienceMetrics}=audienceMetricsResult;
  if(!providerAccountResult.data)return <><header className="platforms-page-header"><p className="eyebrow">Your presence</p><h1>Your recovery networks</h1></header><UnavailableState title="Platforms unavailable" description="Connected accounts could not be loaded. No platform state was changed."/></>;
  const {configuredConnections}=providerAccountResult.data;
  const accounts=configuredConnections.map((account)=>{const metric=audienceMetrics?.find(item=>item.connection_id===account.id&&item.status==="available");return{...account,audience_count:metric?.audience_count===null||metric?.audience_count===undefined?null:Number(metric.audience_count),audience_unit:metric?.audience_unit??null,audience_unavailable:Boolean(audienceMetricsResult.error)};});
  const canonicalAccounts:CanonicalPlatformAccount[]=accounts.flatMap(account=>account.account_type==="official"||account.account_type==="backup"?[{id:account.id,platform:account.platform,label:account.label,external_account_name:account.external_account_name,account_type:account.account_type,connection_health:account.connection_health,provider_status:account.provider_status,url:account.url,external_account_id:account.external_account_id}]:[]);
  const recoveryNetworks=(networksResult.data??[]).map(network=>({id:network.id,main_connected_account_id:network.main_connected_account_id,position:network.position,recovery_account_ids:network.recovery_network_destinations.map(link=>link.recovery_connected_account_id)}));
  const returnedAccountId=typeof params.connectionId==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.connectionId)?params.connectionId:null;
  const returnedProvider=typeof params.social==="string"?params.social.split(":")[0]:typeof params.youtube==="string"?"youtube":null;
  const providerCandidates=returnedProvider?canonicalAccounts.filter(account=>account.platform===returnedProvider):[];
  const returnedAccount=returnedAccountId?canonicalAccounts.find(account=>account.id===returnedAccountId)??null:providerCandidates.length===1?providerCandidates[0]:null;
  const returnedNetwork=returnedAccount?recoveryNetworks.find(network=>network.main_connected_account_id===returnedAccount.id||network.recovery_account_ids.includes(returnedAccount.id))??null:null;
  const platformEvent=derivePlatformContextEvent({transportStatus:recoveryConnectStatus??null,account:returnedAccount,network:returnedNetwork,accounts:canonicalAccounts});
  if(platformEvent)console.info(JSON.stringify({event:platformEvent.type,canonical_role:platformEvent.canonicalRole,provider:platformEvent.provider,network_status:platformEvent.networkStatus,result:"displayed"}));
  const identityAccounts=identityAccountsResult.data??[];
  const recoveryReadiness=calculateRecoveryReadiness({page:creator.public_profile_enabled?"complete":"incomplete",pass:creator.recovery_pass_enabled?"complete":"incomplete",official:identityAccountsResult.error?"unavailable":identityAccounts.some(account=>account.official&&account.verification_status==="verified")?"complete":"incomplete",backup:identityAccountsResult.error?"unavailable":identityAccounts.some(account=>account.account_kind==="backup"&&account.verification_status==="verified")?"complete":"incomplete",plan:plansResult.error?"unavailable":plansResult.data?.[0]?.readiness_status==="ready"?"complete":"incomplete"});
  const metaConnectionId=connectionSelections?.find(connection=>connection.platform==="facebook"&&connection.provider_status==="asset_selection_required")?.id;
  const discordConnectionId=connectionSelections?.find(connection=>connection.platform==="discord"&&["asset_selection_required","public_invite_required"].includes(connection.provider_status))?.id;

  return <>
    {platformEvent&&<PlatformContextBanner event={platformEvent}/>}
    {!entitlements?<UnavailableState compact title="Platform limits unavailable" description="Connected accounts are visible below, but account changes are unavailable until plan limits can be established."/>:<PlatformsManager accounts={accounts ?? []} networks={recoveryNetworks} entitlements={entitlements} recoveryReadiness={recoveryReadiness} connectionCapabilities={listSocialProviders().map((adapter) =>
      providerConnectionCapability(adapter, providerReadiness(adapter).connectionAvailable))}/>
    }
    {youtubeSelection && <YouTubeChannelSelection pendingSelectionId={youtubeSelection.id} role={youtubeSelection.role} channels={youtubeSelection.channels}/>}
    {metaConnectionId&&<MetaAssetSelection connectionId={metaConnectionId}/>}
    {discordConnectionId&&<DiscordGuildSelection connectionId={discordConnectionId}/>}
  </>;
}

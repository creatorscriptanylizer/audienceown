import { PlatformsManager } from "@/components/platforms-manager";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { YouTubeAutomationPanel } from "@/components/youtube-automation-panel";
import { SocialProviderGrid } from "@/components/social-provider-grid";
import { listSocialProviders } from "@/lib/social-providers/registry";
import { ProviderExpansionSummary } from "@/components/providers/provider-expansion-summary";
import { ProviderExpansionTwoSummary } from "@/components/providers/provider-expansion-two-summary";
import { MetaAssetSelection } from "@/components/providers/meta-asset-selection";
import { getSocialProvider } from "@/lib/social-providers/registry";
import { providerReadiness } from "@/lib/social-providers/readiness";
import type { ProviderAccessLevel } from "@/lib/social-providers/types";
import { ProviderExpansionThreeSummary } from "@/components/providers/provider-expansion-three-summary";
import { ProviderExpansionFourSummary } from "@/components/providers/provider-expansion-four-summary";
import { createCreatorAccountProjection } from "@/lib/social-providers/creator-account-projection";

function accessLevel(value:string|null|undefined,fallback:ProviderAccessLevel):ProviderAccessLevel{return value==="none"||value==="development"||value==="standard"||value==="advanced"||value==="approved"?value:fallback;}

export default async function Page({ searchParams }: PageProps<"/dashboard/platforms">) {
  const creator = await requireCreator();
  const supabase = (await createClient())!;
  const params = await searchParams;
  const [{ data: accounts }, { data: socialConnections }, { data: youtube }, { data: activity }, { data: drafts }, {data:providerAssets},{data:accessReviews},{data:manualServices},{data:identityAccounts}] = await Promise.all([
    supabase.from("connected_accounts").select("id,platform,account_type,label,url,is_primary,is_public,position,connection_health,provider_status")
      .eq("creator_id", creator.id).order("position"),
    supabase.from("connected_accounts").select("id,platform,external_account_name,connection_health,provider_status,watch_enabled,auto_send,webhook_enabled,last_sync_at,granted_scopes")
      .eq("creator_id", creator.id).in("platform",listSocialProviders().map((provider)=>provider.provider)),
    supabase.from("connected_accounts").select("id,external_account_name,url,watch_enabled,auto_create_drafts,auto_send,last_sync_at,connection_health,last_connection_error")
      .eq("creator_id", creator.id).eq("platform", "youtube").not("external_account_id", "is", null).maybeSingle(),
    supabase.from("creator_activity").select("id,title,body,created_at,creator_update_id")
      .eq("creator_id", creator.id).order("created_at", { ascending: false }).limit(8),
    supabase.from("creator_updates").select("id,title,updated_at")
      .eq("creator_id", creator.id).eq("source_provider", "youtube").eq("status", "draft")
      .order("updated_at", { ascending: false }).limit(8),
    supabase.from("provider_asset_bindings").select("connected_account_id,provider,display_name,display_handle,authority_status,verification_status,detection_enabled,last_successful_sync_at").eq("creator_id",creator.id),
    supabase.from("provider_access_reviews").select("provider,capability,status,access_level,expires_at"),
    supabase.from("manual_service_connections").select("id,service_name,service_category,canonical_url,verification_status,verification_method,public_visible,official").eq("creator_id",creator.id).is("archived_at",null),
    supabase.from("creator_identity_accounts").select("source_connection_id,provider,display_name,display_handle,verification_status,official,primary_for_provider,account_kind").eq("creator_id",creator.id),
  ]);
  const accountProjection=createCreatorAccountProjection(creator.id,accounts??[],providerAssets??[],identityAccounts??[]);
  const expansionTwoReadiness=Object.fromEntries((["tiktok","instagram","facebook"]as const).map(provider=>{const base=providerReadiness(getSocialProvider(provider)),grantedScopes=[...new Set((socialConnections??[]).filter(connection=>connection.platform===provider).flatMap(connection=>connection.granted_scopes))],missingScopes=base.requiredScopes.filter(scope=>!grantedScopes.includes(scope)),stored=(accessReviews??[]).filter(review=>review.provider===provider&&(!review.expires_at||review.expires_at>new Date().toISOString())).at(-1),reviewStatus=stored?.status==="approved"?"approved":stored?.status==="submitted"?"submitted":stored?.status==="restricted"?"restricted":stored?.status==="rejected"?"rejected":stored?.status==="review_required"?"required":base.reviewStatus;return[provider,{...base,grantedScopes,missingScopes,reviewStatus,accessLevel:accessLevel(stored?.access_level,base.accessLevel),contentDetectionAvailable:base.contentDetectionAvailable&&missingScopes.length===0}];}));
  const metaConnectionId=socialConnections?.find(connection=>connection.platform==="facebook"&&connection.provider_status==="asset_selection_required")?.id;
  const expansionThreeReadiness=Object.fromEntries((["x","linkedin","threads"]as const).map(provider=>[provider,providerReadiness(getSocialProvider(provider))]));
  const expansionFourReadiness=Object.fromEntries((["spotify","snapchat","pinterest"]as const).map(provider=>[provider,providerReadiness(getSocialProvider(provider))]));

  return <>
    <header className="platforms-page-header">
      <p className="eyebrow">Your presence</p>
      <h1>Platforms</h1>
      <p>Manage your official and backup accounts so fans always know where to find you.</p>
    </header>
    <PlatformsManager accounts={accounts ?? []}/>
    <SocialProviderGrid providers={listSocialProviders().map(({provider,displayName,availability,unavailableReason,capabilities})=>({
      provider,displayName,availability,unavailableReason,capabilities}))} connections={socialConnections ?? []} accountProjection={accountProjection}/>
    <ProviderExpansionSummary/>
    <ProviderExpansionTwoSummary readiness={expansionTwoReadiness} assets={providerAssets??[]} metaConnectionId={metaConnectionId}/>
    {metaConnectionId&&<MetaAssetSelection connectionId={metaConnectionId}/>}
    <ProviderExpansionThreeSummary readiness={expansionThreeReadiness} connections={(socialConnections??[]).filter(connection=>["x","linkedin","threads"].includes(connection.platform))}/>
    <ProviderExpansionFourSummary readiness={expansionFourReadiness} connections={(socialConnections??[]).filter(connection=>["spotify","snapchat","pinterest"].includes(connection.platform))} manualServices={manualServices??[]}/>
    <YouTubeAutomationPanel connection={youtube} activity={activity ?? []} drafts={drafts ?? []}
      status={typeof params.youtube === "string" ? params.youtube : undefined}/>
  </>;
}

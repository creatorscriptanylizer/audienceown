import { PlatformsManager } from "@/components/platforms-manager";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { YouTubeAutomationPanel } from "@/components/youtube-automation-panel";
import { SocialProviderGrid } from "@/components/social-provider-grid";
import { listSocialProviders } from "@/lib/social-providers/registry";
import { ProviderExpansionSummary } from "@/components/providers/provider-expansion-summary";

export default async function Page({ searchParams }: PageProps<"/dashboard/platforms">) {
  const creator = await requireCreator();
  const supabase = (await createClient())!;
  const params = await searchParams;
  const [{ data: accounts }, { data: socialConnections }, { data: youtube }, { data: activity }, { data: drafts }] = await Promise.all([
    supabase.from("connected_accounts").select("id,platform,account_type,label,url,is_primary,is_public,position")
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
  ]);

  return <>
    <header className="platforms-page-header">
      <p className="eyebrow">Your presence</p>
      <h1>Platforms</h1>
      <p>Manage your official and backup accounts so fans always know where to find you.</p>
    </header>
    <PlatformsManager accounts={accounts ?? []}/>
    <SocialProviderGrid providers={listSocialProviders().map(({provider,displayName,availability,unavailableReason,capabilities})=>({
      provider,displayName,availability,unavailableReason,capabilities}))} connections={socialConnections ?? []}/>
    <ProviderExpansionSummary/>
    <YouTubeAutomationPanel connection={youtube} activity={activity ?? []} drafts={drafts ?? []}
      status={typeof params.youtube === "string" ? params.youtube : undefined}/>
  </>;
}

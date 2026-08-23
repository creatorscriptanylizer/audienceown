import Link from "next/link";
import { ArrowUpRight, CircleAlert, Link2, LockKeyhole, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { ConnectedPlatformCard, type ConnectedPlatformCardData } from "@/components/connected-platform-card";
import { YouTubeConnectionManager } from "@/components/youtube-connection-manager";
import { requireCreator } from "@/lib/dal";
import { platformPresentation } from "@/lib/dashboard/platform-presentation";
import type { AudienceProvider } from "@/lib/platform-audience/types";
import { createClient } from "@/lib/supabase/server";
import { getCreatorProviderAccounts } from "@/lib/social-providers/creator-provider-accounts";
import { connectionHealthState, isProviderDataStale, providerAuthorizationLabel, relativeProviderUpdate, resolveConnectionStatus } from "@/lib/social-providers/connection-health";
import "./connected-platforms.css";

function roleLabel(value:string){return value==="backup"?"Backup Account":value==="emergency_replacement"?"Emergency Replacement":value==="recovery_destination"?"Recovery Destination":"Main Account";}
function failureCategory(value:unknown){const root=value&&typeof value==="object"?value as Record<string,unknown>:{};const reliability=root.reliability&&typeof root.reliability==="object"?root.reliability as Record<string,unknown>:{};return typeof reliability.lastFailureCategory==="string"?reliability.lastFailureCategory:null;}

export default async function ConnectedAccountsPage(){
  const creator=await requireCreator();
  const client=(await createClient())!;
  const providerResult=await getCreatorProviderAccounts(client,creator.id).catch(()=>null);
  const cards:ConnectedPlatformCardData[]=providerResult?.connections.flatMap((connection)=>{
    const provider=connection.platform as AudienceProvider;
    if(!(provider in platformPresentation))return[];
    const account=providerResult.accounts.find((candidate)=>candidate.provider===provider&&candidate.publicProfileUrl===connection.url);
    const health=connectionHealthState({externalAccountId:connection.external_account_id,health:connection.connection_health,leaseExpiresAt:connection.lease_expires_at,failureCategory:failureCategory(connection.capability_state)});
    const automatic=Boolean(connection.external_account_id);
    return [{id:connection.id,provider,providerName:platformPresentation[provider].label,accountName:connection.external_account_name??account?.displayName??connection.label,role:roleLabel(account?.role??connection.account_type),connectionType:automatic?"oauth":"manual",health,authorization:providerAuthorizationLabel(health,connection.provider_status),capabilityNotice:resolveConnectionStatus({health:connection.connection_health,providerStatus:connection.provider_status}).capabilityNotice,lastSync:automatic?relativeProviderUpdate(connection.last_sync_at):null,stale:automatic&&isProviderDataStale(connection.last_sync_at),permission:automatic&&provider==="youtube"?"Read-only access":automatic?"Provider-authorized access":null,publicUrl:connection.url,connectedAt:connection.created_at}];
  })??[];
  const youtube=providerResult?.connections.find((connection)=>connection.platform==="youtube"&&connection.account_type==="official"&&connection.is_primary&&Boolean(connection.external_account_id))??null;
  const attention=cards.some((card)=>card.health==="action_required"||card.health==="disconnected");
  const syncDates=(providerResult?.connections??[]).filter((connection)=>connection.external_account_id&&connection.last_sync_at).map((connection)=>connection.last_sync_at!).sort((a,b)=>new Date(b).getTime()-new Date(a).getTime());
  const latestSync=syncDates[0]?relativeProviderUpdate(syncDates[0]):"Not available";

  return <div className="connected-command-center">
    <header className="connected-hero"><div><p className="eyebrow">Connected Platforms</p><h1>Manage your connections</h1><p>See every connected account, its current health, and whether you need to take action.</p></div><Link href="/dashboard/platforms" className="button connected-hero-action"><Plus aria-hidden size={17}/> Add or edit accounts <ArrowUpRight aria-hidden size={15}/></Link></header>
    {providerResult&&<section className="connected-summary" aria-label="Connection summary"><article><span className="summary-icon violet"><Link2 aria-hidden/></span><div><p>Total accounts</p><strong>{cards.length}</strong><small>Saved connections</small></div></article><article><span className={`summary-icon ${attention?"amber":"emerald"}`}><ShieldCheck aria-hidden/></span><div><p>All systems</p><strong>{attention?"Attention":"Healthy"}</strong><small>{attention?"Review highlighted connections":"No action required"}</small></div></article><article><span className="summary-icon cyan"><RefreshCw aria-hidden/></span><div><p>Last sync</p><strong>{latestSync}</strong><small>Across all accounts</small></div></article><article><span className="summary-icon secure"><LockKeyhole aria-hidden/></span><div><p>Your data</p><strong>Secure</strong><small>Read-only by default</small></div></article></section>}
    {!providerResult?<section role="alert" className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-6"><CircleAlert aria-hidden className="text-amber-300"/><h2 className="mt-4 font-semibold text-amber-100">Connections could not be loaded</h2><p className="mt-2 text-sm leading-6 text-zinc-400">Your saved accounts were not changed. Refresh the page or try again later.</p></section>:cards.length===0?<section className="surface mt-8 rounded-2xl border-dashed p-7 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-violet-400/10 text-violet-300"><Link2 aria-hidden size={21}/></span><h2 className="mt-5 text-lg font-semibold">Connect your first platform</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-400">Connect your first platform to begin synchronizing your creator presence, or save a public profile as a manual account.</p><div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row"><Link prefetch={false} className="button button-primary min-h-11" href="/api/integrations/youtube/connect?role=official">Connect YouTube</Link><Link className="button button-secondary min-h-11" href="/dashboard/platforms">Add a public URL</Link></div></section>:<section className="connected-directory" aria-labelledby="connection-overview-heading"><div className="connected-section-heading"><p className="eyebrow">Connection directory</p><div className="connected-title-row"><h2 id="connection-overview-heading">Your connections</h2><span>{cards.length} saved {cards.length===1?"account":"accounts"}</span></div></div><div className="connected-grid">{cards.map((connection)=><ConnectedPlatformCard key={connection.id} connection={connection}/>)}</div></section>}
    {youtube&&<div className="connected-manager-wrap"><YouTubeConnectionManager connection={youtube}/></div>}
    <aside className="connected-security-strip"><span><ShieldCheck aria-hidden/></span><div><strong>We never post, modify, or delete content on your behalf.</strong><p>AudienceOwn only reads the data you explicitly authorize.</p></div></aside>
    <nav aria-label="Connected Platform policies" className="mt-8 flex flex-wrap gap-4 text-sm text-zinc-500"><Link className="hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400" href="/privacy">Privacy</Link><Link className="hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400" href="/data-deletion">Data deletion</Link><Link className="hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400" href="/google-api-disclosure">Google API Disclosure</Link></nav>
  </div>;
}

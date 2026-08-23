import Link from "next/link";
import { ArrowUpRight, ChevronDown, RefreshCw } from "lucide-react";
import { PlatformBrandIcon } from "@/components/dashboard/platform-brand-icon";
import type { AudienceProvider } from "@/lib/platform-audience/types";
import { connectionHealthDescriptions, connectionHealthLabels, type ConnectionHealthState } from "@/lib/social-providers/connection-health";

export type ConnectedPlatformCardData = {
  id:string; provider:AudienceProvider; providerName:string; accountName:string; role:string;
  connectionType:"oauth"|"manual"; health:ConnectionHealthState; authorization:string; capabilityNotice?:string|null;
  lastSync:string|null; stale:boolean; permission:string|null; publicUrl:string|null; connectedAt:string|null;
};

const tones:Record<ConnectionHealthState,string>={healthy:"bg-emerald-400",syncing:"bg-amber-300",action_required:"bg-orange-400",temporarily_unavailable:"bg-orange-400",disconnected:"bg-red-400",manual:"bg-zinc-400"};

export function ConnectedPlatformCard({connection}:{connection:ConnectedPlatformCardData}){
  const automatic=connection.connectionType==="oauth";
  const displayedStatus=automatic?connectionHealthLabels[connection.health]:"Connected";
  return <article className="connected-card" data-provider={connection.provider} aria-labelledby={`connection-${connection.id}`}>
    <div className="connected-card-header"><div className="connected-identity"><span className="connected-provider-icon"><PlatformBrandIcon provider={connection.provider} label={`${connection.providerName} icon`}/></span><div><p>{connection.providerName}</p><h3 id={`connection-${connection.id}`}>{connection.accountName}</h3><div className="connected-role-line"><span>{connection.role}</span><i>{automatic?"OAuth connection":"Manual account"}</i></div></div></div><span className={`connected-health-pill health-${connection.health}`}><i aria-hidden className={`size-2 rounded-full ${tones[connection.health]}`}/>{displayedStatus}</span></div>
    <div className="connected-status-panel"><p>{connectionHealthDescriptions[connection.health]}</p>{connection.capabilityNotice&&<small>{connection.capabilityNotice} No action is required from you.</small>}{automatic&&connection.stale&&<small className="stale-note">Your last synchronized data may not be current.</small>}</div>
    <dl className="connected-metadata sm:grid-cols-2"><div><dt>Connection status</dt><dd>{displayedStatus}</dd></div><div><dt>Authorization</dt><dd>{connection.authorization}</dd></div>{automatic&&<><div><dt>Last successful sync</dt><dd>{connection.lastSync}{connection.stale&&<span className="freshness-pill">Stale</span>}</dd></div><div><dt>Permission</dt><dd className={connection.permission==="Read-only access"?"permission-readonly":"permission-authorized"}>{connection.permission}</dd></div></>}</dl>
    <div className="connected-card-actions">{connection.health==="action_required"&&connection.provider==="youtube"&&<a className="button button-primary" href={`/api/integrations/youtube/connect?role=${connection.role === "Backup Account" ? "backup" : "official"}&connectionId=${encodeURIComponent(connection.id)}`}><RefreshCw aria-hidden size={15}/>Reconnect YouTube</a>}{connection.publicUrl&&<a className="button button-secondary" href={connection.publicUrl} target="_blank" rel="noreferrer">View public account <ArrowUpRight aria-hidden size={14}/><span className="sr-only"> (opens in a new tab)</span></a>}<Link className="button button-secondary" href="/dashboard/platforms">{automatic?"Manage account":"Edit or remove"}</Link></div>
    <details className="connected-details group"><summary className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400">Connection details <ChevronDown aria-hidden size={16} className="transition group-open:rotate-180 motion-reduce:transition-none"/></summary><dl className="sm:grid-cols-2"><div><dt>Provider</dt><dd>{connection.providerName}</dd></div><div><dt>Account name</dt><dd>{connection.accountName}</dd></div><div><dt>Role</dt><dd>{connection.role}</dd></div><div><dt>Connection type</dt><dd>{automatic?"OAuth connection":"Manual connection"}</dd></div><div><dt>Health</dt><dd>{displayedStatus}</dd></div>{automatic&&<><div><dt>Permission level</dt><dd>{connection.permission}</dd></div><div><dt>Last synchronization</dt><dd>{connection.lastSync}</dd></div></>}{connection.publicUrl&&<div><dt>Public URL</dt><dd className="break-all"><a href={connection.publicUrl} target="_blank" rel="noreferrer">{connection.publicUrl}</a></dd></div>}{connection.connectedAt&&<div><dt>Connected</dt><dd><time dateTime={connection.connectedAt}>{new Intl.DateTimeFormat("en",{dateStyle:"medium",timeZone:"UTC"}).format(new Date(connection.connectedAt))}</time></dd></div>}</dl>{automatic&&connection.provider==="youtube"&&<p>Read-only access lets AudienceOwn read public channel information and subscriber metrics. It cannot upload, edit, delete, or manage your channel.</p>}</details>
  </article>;
}

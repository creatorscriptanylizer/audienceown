import Link from "next/link";import { AlertTriangle,CheckCircle2,LockKeyhole,Radio } from "lucide-react";
import type { ProviderCapabilities,ProviderAvailability,SocialProvider } from "@/lib/social-providers/types";
type Definition={provider:SocialProvider;displayName:string;availability:ProviderAvailability;unavailableReason?:string;capabilities:ProviderCapabilities};
type Connection={id:string;platform:string;external_account_name:string|null;connection_health:string;provider_status:string;watch_enabled:boolean;
auto_send:boolean;webhook_enabled:boolean;last_sync_at:string|null;granted_scopes:string[]};
export function SocialProviderGrid({providers,connections}:{providers:Definition[];connections:Connection[]}){
 const byProvider=new Map(connections.map((connection)=>[connection.platform,connection]));
 return <section className="mt-10"><div><p className="eyebrow">Provider network</p><h2 className="mt-2 text-2xl font-semibold">Connected content sources</h2>
 <p className="mt-2 text-sm text-zinc-400">Every card reflects capabilities available through the provider&apos;s official API.</p></div>
 <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{providers.map((definition)=>{const connection=byProvider.get(definition.provider);
  const detection=definition.capabilities.contentDetection;return <article className="surface rounded-2xl p-5" key={definition.provider}>
   <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">{definition.displayName}</h3>
    <p className="mt-1 text-xs text-zinc-500">{connection?.external_account_name??"Not connected"}</p></div>
    {connection?<span className="flex items-center gap-1 text-xs text-emerald-300"><CheckCircle2 size={13}/>{connection.connection_health}</span>:
      <span className="text-xs text-zinc-500">Disconnected</span>}</div>
   {definition.unavailableReason&&<p className="mt-4 flex gap-2 rounded-lg bg-amber-400/5 p-3 text-xs text-amber-100"><AlertTriangle size={14} className="shrink-0"/>{definition.unavailableReason}</p>}
   <dl className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-white/[.03] p-2"><dt className="text-zinc-500">Detection</dt><dd>{detection?"Official API":"Unavailable"}</dd></div>
    <div className="rounded-lg bg-white/[.03] p-2"><dt className="text-zinc-500">Delivery</dt><dd>{definition.capabilities.automaticPublishing?"Approval / optional auto":"Manual draft"}</dd></div>
    <div className="rounded-lg bg-white/[.03] p-2"><dt className="text-zinc-500">Source</dt><dd>{definition.capabilities.webhooks?"Webhook":definition.capabilities.polling?"Polling":"Manual import"}</dd></div>
    <div className="rounded-lg bg-white/[.03] p-2"><dt className="text-zinc-500">Last sync</dt><dd>{connection?.last_sync_at?new Date(connection.last_sync_at).toLocaleDateString():"Never"}</dd></div></dl>
   <div className="mt-4 flex flex-wrap gap-2">{connection?<><Link className="button button-secondary" href={`/api/integrations/${definition.provider}/reconnect`}>Reconnect</Link>
    {detection&&<span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 text-xs"><Radio size={12}/>{connection.watch_enabled?"Watching":"Paused"}</span>}</>:
    definition.capabilities.oauth?<Link className="button button-secondary" href={`/api/integrations/${definition.provider}/connect`}>Connect</Link>:
    <span className="inline-flex items-center gap-1 text-xs text-zinc-500"><LockKeyhole size={12}/>Connection unavailable</span>}</div>
  </article>;})}</div></section>;
}

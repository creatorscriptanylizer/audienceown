import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { listEcosystemProviders } from "@/lib/ecosystem/providers";
import { logPageQueryFailure } from "@/lib/data-availability";
import { UnavailableState } from "@/components/product-state";
import { AutomationSummary } from "@/components/ecosystem/automation-summary";
import { AutomationIncidentCard } from "@/components/ecosystem/automation-incident-card";
import { AutomationTimeline } from "@/components/ecosystem/automation-timeline";
import { ProviderHealthCard } from "@/components/ecosystem/provider-health-card";
import { AutomationSettings } from "@/components/ecosystem/automation-settings";
import { ProviderExpansionSummary } from "@/components/providers/provider-expansion-summary";

export default async function EcosystemPage() {
  const creator = await requireCreator();
  const db = await createClient();
  if (!db) throw new Error("Supabase is not configured");
  const [destinationsResult, incidentsResult, observationsResult] = await Promise.all([
    db.from("creator_ecosystem_destinations").select("id,provider,destination_type,display_name,canonical_url,verification_status,official,primary_for_type,public_visible,sync_status,automation_enabled,auto_apply_safe_changes,sync_priority,consecutive_failures,last_successful_sync_at,next_sync_at,automation_paused_at").eq("creator_id", creator.id).order("destination_type"),
    db.from("ecosystem_automation_incidents").select("id,incident_type,severity,status,title,summary,created_at").eq("creator_id", creator.id).order("created_at", { ascending: false }).limit(12),
    db.from("ecosystem_sync_observations").select("id,observation_type,provider,severity,observed_at").eq("creator_id", creator.id).order("observed_at", { ascending: false }).limit(20),
  ]);
  logPageQueryFailure("ecosystem", "destinations", destinationsResult.error);
  logPageQueryFailure("ecosystem", "automation_incidents", incidentsResult.error);
  logPageQueryFailure("ecosystem", "sync_observations", observationsResult.error);
  const rows = destinationsResult.data ?? [];
  const incidentRows = incidentsResult.data ?? [];
  const providers = listEcosystemProviders();
  return <div className="space-y-8"><header><p className="eyebrow">Canonical identity destinations</p><h1 className="mt-2 text-3xl font-semibold">Ecosystem</h1><p className="mt-2 max-w-3xl text-sm text-zinc-400">Verified destinations are continuously checked. Safe metadata changes can apply automatically; authority loss suppresses public presentation and requires authoritative recovery.</p></header><ProviderExpansionSummary/>
    <AutomationSummary destinations={rows} incidents={incidentRows} destinationsAvailable={!destinationsResult.error} incidentsAvailable={!incidentsResult.error}/>
    <section><h2 className="text-xl font-semibold">Destinations</h2><div className="mt-4 grid gap-4 xl:grid-cols-2">{destinationsResult.error ? <UnavailableState compact title="Destinations unavailable" description="Canonical destinations could not be loaded."/> : rows.length ? rows.map((destination) => <article className="surface rounded-xl p-5" key={destination.id}><div className="flex justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-zinc-500">{destination.destination_type.replaceAll("_", " ")} · {destination.provider}</p><h3 className="mt-1 font-semibold">{destination.display_name}</h3><a className="mt-1 block truncate text-sm text-sky-400" href={destination.canonical_url} rel="noreferrer" target="_blank">{destination.canonical_url}</a></div><span className="text-xs">{destination.verification_status.replaceAll("_", " ")}</span></div><p className="mt-3 text-xs text-zinc-500">Next sync: {destination.next_sync_at ? new Date(destination.next_sync_at).toLocaleString() : "not scheduled"} · {destination.consecutive_failures} failures</p><AutomationSettings destination={destination}/></article>) : <p className="surface rounded-xl p-5 text-sm text-zinc-400">No ecosystem destinations yet.</p>}</div></section>
    <section><h2 className="font-semibold">Provider health</h2>{destinationsResult.error ? <UnavailableState className="mt-4" compact title="Provider health unavailable" description="Provider sync health could not be established."/> : <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{providers.slice(0, 8).map((provider) => { const owned = rows.filter((destination) => destination.provider === provider.provider); return <ProviderHealthCard key={provider.provider} provider={provider.provider} webhookEnabled={provider.capabilities.webhookSupported && provider.enabled} failures={owned.reduce((count, destination) => count + destination.consecutive_failures, 0)} lastSuccess={owned.map((destination) => destination.last_successful_sync_at).filter(Boolean).sort().at(-1) ?? null}/>; })}</div>}</section>
    {incidentsResult.error ? <UnavailableState compact title="Review status unavailable" description="Destination incidents could not be loaded."/> : incidentRows.length > 0 && <section><h2 className="font-semibold">Destinations requiring review</h2><div className="mt-4 grid gap-3 xl:grid-cols-2">{incidentRows.map((incident) => <AutomationIncidentCard key={incident.id} incident={incident}/>)}</div></section>}
    {observationsResult.error ? <UnavailableState compact title="Sync activity unavailable" description="Recent ecosystem synchronization activity could not be loaded."/> : <AutomationTimeline observations={observationsResult.data ?? []}/>}
  </div>;
}

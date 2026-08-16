import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { logPageQueryFailure } from "@/lib/data-availability";
import { UnavailableState } from "@/components/product-state";
import { IdentityOverviewCard } from "@/components/identity/identity-overview-card";
import { IdentityAccountCard } from "@/components/identity/identity-account-card";
import { IdentityDomainCard } from "@/components/identity/identity-domain-card";
import { IdentityRelationshipTimeline } from "@/components/identity/identity-relationship-timeline";
import { IdentityHistory } from "@/components/identity/identity-history";
import { TrustCard } from "@/components/identity/trust-card";
import { TrustHistory } from "@/components/identity/trust-history";
import { MonitoringSummary } from "@/components/identity/monitoring-summary";
import { MonitoringIncidentCard } from "@/components/identity/monitoring-incident-card";
import { IdentityChangeTimeline } from "@/components/identity/identity-change-timeline";
import { SecurityAlertList } from "@/components/identity/security-alert-list";

export default async function IdentityPage() {
  const creator = await requireCreator();
  const db = await createClient();
  if (!db) throw new Error("Supabase is not configured");
  const results = await Promise.all([
    db.from("creator_identity_profiles").select("*").eq("creator_id", creator.id).maybeSingle(),
    db.from("creator_identity_accounts").select("*").eq("creator_id", creator.id).order("provider"),
    db.from("creator_identity_domains").select("*").eq("creator_id", creator.id).order("primary_domain", { ascending: false }),
    db.from("creator_identity_relationships").select("id,relationship_type,status,created_at,source_account_id,target_account_id").eq("creator_id", creator.id).order("created_at", { ascending: false }),
    db.from("creator_identity_events").select("id,event_type,source,created_at").eq("creator_id", creator.id).order("id", { ascending: false }).limit(30),
    db.from("creator_trust_evaluations").select("id,trust_state,evaluated_at,expires_at").eq("creator_id", creator.id).order("evaluated_at", { ascending: false }).limit(1),
    db.from("creator_trust_signals").select("id,evaluation_id,signal_type,signal_state,provider_family,reason_code,expires_at").eq("creator_id", creator.id),
    db.from("creator_trust_recommendations").select("id,evaluation_id,priority,title,description,action_url,resolved_at").eq("creator_id", creator.id),
    db.from("creator_trust_events").select("id,event_type,previous_state,new_state,created_at").eq("creator_id", creator.id).order("id", { ascending: false }).limit(30),
    db.from("identity_monitoring_observations").select("id,observation_type,severity,provider,observed_at").eq("creator_id", creator.id).order("observed_at", { ascending: false }).limit(30),
    db.from("identity_monitoring_incidents").select("id,severity,status,title,summary,emergency_id,created_at").eq("creator_id", creator.id).order("created_at", { ascending: false }).limit(20),
    db.from("creator_security_alerts").select("id,severity,title,message,read_at,dismissed_at,created_at").eq("creator_id", creator.id).order("created_at", { ascending: false }).limit(20),
  ]);
  const names = ["profile", "accounts", "domains", "relationships", "history", "trust_evaluation", "trust_signals", "trust_recommendations", "trust_history", "monitoring_observations", "monitoring_incidents", "security_alerts"];
  results.forEach((result, index) => logPageQueryFailure("identity", names[index], result.error));
  const [profileResult, accountsResult, domainsResult, relationshipsResult, eventsResult, evaluationsResult, trustSignalsResult, recommendationsResult, trustEventsResult, observationsResult, incidentsResult, alertsResult] = results;
  const rows = accountsResult.data ?? [];
  const evaluation = evaluationsResult.data?.[0] ?? null;
  const evaluationSignals = (trustSignalsResult.data ?? []).filter((signal) => signal.evaluation_id === evaluation?.id);
  const evaluationRecommendations = (recommendationsResult.data ?? []).filter((item) => item.evaluation_id === evaluation?.id);
  const open = (incidentsResult.data ?? []).filter((incident) => !["resolved", "dismissed"].includes(incident.status));
  const monitoringAvailable = !observationsResult.error && !incidentsResult.error;
  const trustAvailable = !evaluationsResult.error && !trustSignalsResult.error && !recommendationsResult.error;
  const overviewAvailable = !profileResult.error && !accountsResult.error;

  return <div className="space-y-6"><header><p className="eyebrow">Creator identity graph</p><h1 className="mt-2 text-3xl font-semibold">Identity</h1><p className="mt-2 max-w-3xl text-sm text-zinc-400">One verified map of your official accounts, domains, replacements, and migrations. Handles may change; stable provider identity keeps continuity intact.</p></header>
    {monitoringAvailable ? <><MonitoringSummary open={open.length} recent={observationsResult.data?.length ?? 0} lastRun={observationsResult.data?.[0]?.observed_at ?? null}/>{open.length > 0 && <section><p className="eyebrow">Open incidents</p><h2 className="mt-2 text-xl font-semibold">Identity changes requiring action</h2><div className="mt-4 space-y-3">{open.map((incident) => <MonitoringIncidentCard incident={incident} key={incident.id}/>)}</div></section>}</> : <UnavailableState compact title="Monitoring unavailable" description="Identity monitoring status could not be established right now."/>}
    {trustAvailable ? <TrustCard evaluation={evaluation} signals={evaluationSignals} recommendations={evaluationRecommendations}/> : <UnavailableState compact title="Trust status unavailable" description="Trust evaluation could not be established right now."/>}
    {overviewAvailable ? <IdentityOverviewCard status={profileResult.data?.identity_status ?? "incomplete"} total={rows.length} verified={rows.filter((row) => row.verification_status === "verified").length} attention={rows.filter((row) => row.verification_status === "needs_attention").length} providers={new Set(rows.map((row) => row.provider)).size}/> : <UnavailableState compact title="Identity overview unavailable" description="Account and verification totals could not be loaded."/>}
    <section><p className="eyebrow">Accounts</p><h2 className="mt-2 text-xl font-semibold">Verified identity accounts</h2><div className="mt-4 grid gap-4 xl:grid-cols-2">{accountsResult.error ? <UnavailableState compact title="Accounts unavailable" description="Verified identity accounts could not be loaded."/> : rows.length ? rows.map((account) => <IdentityAccountCard account={account} key={account.id}/>) : <p className="surface rounded-xl p-5 text-sm text-zinc-400">Verified connected accounts will appear after identity synchronization.</p>}</div></section>
    <section><p className="eyebrow">Domains</p><h2 className="mt-2 text-xl font-semibold">Verified domains</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{domainsResult.error ? <UnavailableState compact title="Domains unavailable" description="Verified domains could not be loaded."/> : (domainsResult.data ?? []).map((domain) => <IdentityDomainCard domain={domain} key={domain.id}/>)}</div></section>
    <div className="grid gap-6 xl:grid-cols-2">
      {observationsResult.error ? <UnavailableState compact title="Activity unavailable" description="Identity change activity could not be loaded."/> : <IdentityChangeTimeline observations={observationsResult.data ?? []}/>}
      {alertsResult.error ? <UnavailableState compact title="Security alerts unavailable" description="Security alert status could not be loaded."/> : <SecurityAlertList alerts={alertsResult.data ?? []}/>}
      {trustEventsResult.error ? <UnavailableState compact title="Trust history unavailable" description="Trust history could not be loaded."/> : <TrustHistory events={trustEventsResult.data ?? []}/>}
      {relationshipsResult.error ? <UnavailableState compact title="Relationship history unavailable" description="Identity relationships could not be loaded."/> : <IdentityRelationshipTimeline relationships={relationshipsResult.data ?? []}/>}
      {eventsResult.error ? <UnavailableState compact title="Identity history unavailable" description="Identity history could not be loaded."/> : <IdentityHistory events={eventsResult.data ?? []}/>}
    </div>
  </div>;
}

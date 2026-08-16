import { RecoveryCoverageCard } from "@/components/recovery-coverage-card";
import { RecoveryCoverageTrend } from "@/components/recovery-coverage-trend";
import { RecoveryFunnel } from "@/components/recovery-funnel";
import { RecoveryOpportunityCard } from "@/components/recovery-opportunity-card";
import { RecoveryTransportBreakdown } from "@/components/recovery-transport-breakdown";
import { RecoveryUpdatePerformance } from "@/components/recovery-update-performance";
import { LiveRecoveryAnalytics } from "@/components/recovery/live-recovery-analytics";
import {
  liveRecoveryAnalytics,
  recoveryIncidents,
  recoveryAnalyticsOverview,
  recoveryFunnel,
  recoveryOpportunities,
  recoveryTransportBreakdown,
  recoveryTrend,
  recoveryUpdates,
} from "@/lib/recovery-analytics-server";

export default async function RecoveryAnalyticsPage({ searchParams }: { searchParams: Promise<{ incident?: string }> }) {
  const requestedIncident = (await searchParams).incident;
  const incidentsResult = await recoveryIncidents();
  const incidents = incidentsResult.status === "available" ? incidentsResult.incidents : [];
  const selectedIncident = incidents.find((incident) => incident.id === requestedIncident)
    ?? incidents.find((incident) => incident.lifecycle_status === "active") ?? incidents[0] ?? null;
  const live = selectedIncident ? await liveRecoveryAnalytics(selectedIncident.id).catch(() => null) : null;
  const results = await Promise.allSettled([
    recoveryAnalyticsOverview(),
    recoveryTransportBreakdown(),
    recoveryTrend(30),
    recoveryFunnel(),
    recoveryUpdates(10),
    recoveryOpportunities(),
  ]);
  const [overviewResult, transportsResult, trendResult, funnelResult, updatesResult, opportunitiesResult] = results;
  if (overviewResult.status === "rejected") return <section>
    <p className="eyebrow">Recovery analytics</p><h1 className="mt-2 text-3xl font-semibold">Analytics unavailable</h1>
    <p className="mt-3 text-zinc-400">Coverage could not be loaded safely. Try again later.</p>
  </section>;
  const overview = overviewResult.value;
  const partial = results.some((result) => result.status === "rejected");
  return <div className="space-y-10">
    <section><p className="eyebrow">Recovery analytics</p><h1 className="mt-2 text-3xl font-semibold">Audience recovery coverage</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">Recovery coverage is the percentage of your active audience with a currently usable selected Recovery Pass.</p>
      {partial && <p role="status" className="mt-4 rounded-xl border p-3 text-sm text-zinc-400">Some analytics are temporarily unavailable.</p>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <RecoveryCoverageCard label="Recovery coverage" value={overview.recovery_coverage_rate === null ? "Unavailable" : `${overview.recovery_coverage_rate}%`} description="The percentage of your audience with a currently usable Recovery Pass." />
        <RecoveryCoverageCard label="Recovery-ready" value={overview.recovery_ready_relationships} description="Followers who can receive a recovery update through their selected Recovery Pass." />
        <RecoveryCoverageCard label="Uncovered" value={overview.uncovered_relationships} description="Followers without a currently usable Recovery Pass." />
        <RecoveryCoverageCard label="Partially configured" value={overview.partially_configured_relationships} description="Followers who started setup but do not currently have a usable selected Recovery Pass." />
        <RecoveryCoverageCard label="Change" value={overview.change_vs_previous_snapshot === null ? "Unavailable" : `${overview.change_vs_previous_snapshot > 0 ? "+" : ""}${overview.change_vs_previous_snapshot} pts`} description="Change since the previous daily snapshot." />
      </div>
      {overview.total_relationships === 0 && <p className="mt-4 text-sm text-zinc-500">Your active audience is empty, so a coverage rate is not available yet.</p>}
    </section>
    <LiveRecoveryAnalytics key={selectedIncident?.id ?? incidentsResult.status} incidents={incidents} incidentsAvailable={incidentsResult.status === "available"} initial={live} selectedId={selectedIncident?.id ?? null}/>
    {funnelResult.status === "fulfilled" && <RecoveryFunnel rows={funnelResult.value} />}
    {transportsResult.status === "fulfilled" && <RecoveryTransportBreakdown rows={transportsResult.value} />}
    {trendResult.status === "fulfilled" && <RecoveryCoverageTrend rows={trendResult.value} />}
    {updatesResult.status === "fulfilled" && <RecoveryUpdatePerformance rows={updatesResult.value} />}
    {opportunitiesResult.status === "fulfilled" && <section><h2 className="text-xl font-semibold">Recovery opportunities</h2>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">{opportunitiesResult.value.map((insight) =>
        <RecoveryOpportunityCard key={insight.type} insight={insight} />)}</div>
    </section>}
  </div>;
}

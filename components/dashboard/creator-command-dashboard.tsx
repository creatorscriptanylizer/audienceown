import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, CircleDashed, FileText, Link2, Mail, MailPlus, MousePointerClick, Send, ShieldCheck, TrendingUp, Users } from "lucide-react";
import type { CreatorDashboardData, DashboardDataAvailability } from "@/lib/dashboard/creator-dashboard";
import type { RecoveryAudienceRange, RecoveryAudienceSummary } from "@/lib/recovery-audience";
import { formatCompactAudience } from "@/lib/dashboard/format-compact-number";
import { DashboardRefresh } from "./dashboard-refresh";
import { DashboardProgressRing } from "./dashboard-progress-ring";
import { PlatformBrandIcon } from "./platform-brand-icon";
import { platformPresentation } from "@/lib/dashboard/platform-presentation";
import { RecoveryPassCard } from "./recovery-pass-card";
import { RecoveryAudienceChart } from "./recovery-audience-chart";
import { LocalDateTime } from "@/components/local-date-time";
import { getIntentDefinition } from "@/lib/broadcast-studio";
import { formatBroadcastStatus, formatBroadcastType } from "@/lib/updates";
import { getCreatorInsight, type CreatorInsight } from "@/lib/dashboard/creator-insights";
import "./creator-command-dashboard.css";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400";
const manageAccountsClass = `${focus} premium-primary-action`;
const exact = (value: number) => new Intl.NumberFormat("en-US").format(value);
const synchronizedAt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

function MetricCard({ label, value, support, icon, tone, children }: { label: string; value: string; support: string; icon: React.ReactNode; tone: string; children?: React.ReactNode }) {
  return <article aria-label={`${label}: ${value}`} className="premium-metric-card" style={{ "--metric-tone": tone } as React.CSSProperties}><div className="premium-metric-top"><p>{label}</p><span>{icon}</span></div><div className="premium-metric-value">{value}</div><p className="premium-metric-support">{support}</p>{children}</article>;
}

function recoveryRanges(data: CreatorDashboardData) {
  const supplied = data.recoveryAudienceRanges as Record<RecoveryAudienceRange, RecoveryAudienceSummary> | undefined;
  if (supplied) return supplied;
  return { "7d": data.recoveryAudience, "30d": data.recoveryAudience, "90d": data.recoveryAudience, all: data.recoveryAudience };
}

const channelLabels = { email: "Email", sms: "SMS", whatsapp: "WhatsApp", browser_notification: "Browser" } as const;

const available = (state: DashboardDataAvailability | undefined) => state?.status !== "unavailable";

function AudienceUpdates({ summary, availability }: { summary: NonNullable<CreatorDashboardData["audienceUpdates"]>; availability?: DashboardDataAvailability }) {
  const isAvailable = available(availability);
  const metrics = [
    { label: "Updates Sent", value: isAvailable ? exact(summary.updatesSent) : "—", support: isAvailable ? `Last ${summary.periodDays} days` : "Temporarily unavailable", icon: <Send size={17}/> },
    { label: "Audience Reached", value: isAvailable ? exact(summary.audienceReached) : "—", support: isAvailable ? "Confirmed delivery" : "Temporarily unavailable", icon: <Users size={17}/> },
    { label: "Open Rate", value: "—", support: "Tracking not available yet", icon: <Mail size={17}/> },
    { label: "Click Rate", value: "—", support: "Tracking not available yet", icon: <MousePointerClick size={17}/> },
  ];
  return <section data-dashboard-section="audience-updates" className="audience-updates premium-dashboard-section" aria-labelledby="audience-updates-title">
    <div className="premium-section-heading"><div><p className="premium-eyebrow">Audience updates</p><h2 id="audience-updates-title">Stay connected with your audience</h2><p>Share news, releases, livestreams, events, and important account updates with the followers who want to hear from you.</p></div><div className="audience-update-actions"><Link href="/dashboard/updates/new" className={`${focus} premium-primary-action`}>Create Update <ArrowRight size={14}/></Link><Link href="/dashboard/updates" className={`${focus} premium-secondary-action`}>View History <ArrowRight size={14}/></Link></div></div>
    <div className="audience-update-metrics">{metrics.map((metric) => <article key={metric.label} aria-label={`${metric.label}: ${metric.value}`}><div><span>{metric.icon}</span><p>{metric.label}</p></div><strong>{metric.value}</strong><small>{metric.support}</small></article>)}</div>
    <div className="audience-update-body">
      <section className="recent-updates"><div className="updates-subheading"><div><p className="premium-eyebrow">Recent updates</p><h3>Latest broadcasts</h3></div><Link href="/dashboard/updates" className={`${focus} premium-text-action`}>View all <ArrowRight size={14}/></Link></div>
        {!isAvailable ? <div className="recent-updates-empty"><CircleDashed size={26}/><h3>Recent updates unavailable</h3><p>We could not load your update history right now.</p></div> : summary.recent.length ? <div className="recent-update-list">{summary.recent.slice(0, 5).map((update) => { const definition = getIntentDefinition(update.broadcastIntent); const platform = update.sourcePlatform ? platformPresentation[update.sourcePlatform] : null; const displayStatus = update.status === "queued" && update.wasSent ? "Sent" : formatBroadcastStatus(update.status); return <Link href={`/dashboard/updates/${update.id}`} key={update.id} className={`recent-update-row ${update.sourcePlatform ? "" : "no-platform"}`}>
            {update.sourcePlatform && <PlatformBrandIcon provider={update.sourcePlatform} label={platform?.label ?? update.sourcePlatform} size="sm"/>}
            <div className="recent-update-copy"><span><b>{definition.title}</b><i className={`update-summary-status status-${update.status}`}>{displayStatus}</i></span><h4>{update.title}</h4><p>{definition.title}{platform ? ` · ${platform.label}` : ""}</p><small>{update.deliveryChannels.length ? `Delivered via ${update.deliveryChannels.map((channel) => channelLabels[channel]).join(", ")}` : "Delivery not started"}</small></div>
            <div className="recent-update-performance"><strong>{exact(update.deliveredCount)} delivered</strong><span>Opened —</span><span>Clicked —</span><time dateTime={update.occurredAt}><LocalDateTime value={update.occurredAt}/></time></div>
          </Link>; })}</div> : <div className="recent-updates-empty"><div className="updates-empty-icon"><MailPlus size={26}/></div><h3>No updates sent yet</h3><p>Share your first update to start communicating directly with your audience.</p><div><Link href="/dashboard/updates/new" className={`${focus} premium-primary-action`}>Create your first update <ArrowRight size={14}/></Link><Link href="/dashboard/updates" className={`${focus} premium-secondary-action`}>View update history <ArrowRight size={14}/></Link></div></div>}
      </section>
      <aside className="updates-operations">
        {!isAvailable ? <article className="next-scheduled empty"><CalendarClock size={22}/><p className="premium-eyebrow">Next scheduled</p><h3>—</h3><p>Temporarily unavailable</p></article> : summary.nextScheduled ? <article className="next-scheduled"><p className="premium-eyebrow">Next scheduled</p><h3>{summary.nextScheduled.title}</h3><p>{formatBroadcastType(summary.nextScheduled.broadcastType)}{summary.nextScheduled.sourcePlatform && platformPresentation[summary.nextScheduled.sourcePlatform] ? ` · ${platformPresentation[summary.nextScheduled.sourcePlatform].label}` : ""}</p><strong><CalendarClock size={15}/><LocalDateTime value={summary.nextScheduled.occurredAt}/></strong><Link href={`/dashboard/updates/${summary.nextScheduled.id}`} className={`${focus} premium-text-action`}>View / Edit <ArrowRight size={14}/></Link></article> : <article className="next-scheduled empty"><CalendarClock size={22}/><p className="premium-eyebrow">Next scheduled</p><h3>Nothing scheduled</h3><p>Plan your next audience update.</p><Link href="/dashboard/updates/new" className={`${focus} premium-text-action`}>Schedule an update <ArrowRight size={14}/></Link></article>}
        <article className="drafts-summary"><span><FileText size={20}/></span><p className="premium-eyebrow">Drafts</p><h3>{isAvailable ? `${exact(summary.drafts)} drafts` : "—"}</h3><p>{isAvailable ? "Updates waiting to be finished." : "Temporarily unavailable"}</p>{isAvailable && <Link href="/dashboard/updates?filter=draft" className={`${focus} premium-text-action`}>View drafts <ArrowRight size={14}/></Link>}</article>
      </aside>
    </div>
  </section>;
}

export function CreatorCommandDashboard({ data, insight: suppliedInsight, showRefresh = true }: { data: CreatorDashboardData; insight?: CreatorInsight; showRefresh?: boolean }) {
  const official = data.dashboardAccounts ?? [];
  const destinations = [...(data.recoveryDestinations ?? [])].sort((a, b) => b.recoveryPassOptIns - a.recoveryPassOptIns);
  const ranges = recoveryRanges(data);
  const recoveryAvailable = available(data.availability?.recoveryAudience);
  const destinationsAvailable = available(data.availability?.recoveryDestinations);
  const thirty = ranges["30d"].growth.points;
  const periodGrowth = thirty.length > 1 ? Math.max(0, thirty.at(-1)!.protectedAudience - thirty[0].protectedAudience) : 0;
  const protectedAudience = data.recoveryAudience.protectedAudience;
  const recoveryConnections = data.recoveryAudience.recoveryConnections;
  const readiness = data.recoveryReadiness.score;
  const firstName = data.creator.displayName.trim().split(/\s+/)[0] || data.creator.displayName;
  const insight = suppliedInsight ?? getCreatorInsight(data);

  return <div className="premium-creator-dashboard">
    <header className="premium-dashboard-header"><div><p className="premium-eyebrow">Creator command center</p><h1>Welcome back, {firstName}! <span aria-hidden>👋</span></h1><div className="dashboard-primary-insight" data-insight-id={insight.id}><strong>{insight.title}</strong><p>{insight.message}</p></div><span className="dashboard-sync"><i/>Last synchronized <time dateTime={data.calculatedAt}>{synchronizedAt.format(new Date(data.calculatedAt))} UTC</time></span></div><div className="premium-header-actions">{showRefresh && <DashboardRefresh/>}<Link href="/dashboard/platforms" className={manageAccountsClass}>Manage accounts</Link></div></header>

    <section className="premium-recovery-pass-row"><RecoveryPassCard recoveryPass={data.recoveryPass}/></section>

    <section aria-label="Recovery network metrics" className="premium-kpi-grid">
      <MetricCard label="Protected Audience" value={recoveryAvailable ? formatCompactAudience(protectedAudience).compact : "—"} support={recoveryAvailable ? "Unique Recovery Pass participants" : "Temporarily unavailable"} icon={<Users size={19}/>} tone="#34d399"/>
      <MetricCard label="Recovery Connections" value={recoveryAvailable ? formatCompactAudience(recoveryConnections).compact : "—"} support={recoveryAvailable ? "Total destination opt-ins" : "Temporarily unavailable"} icon={<Link2 size={19}/>} tone="#22d3ee"/>
      <MetricCard label="Audience Growth" value={recoveryAvailable ? periodGrowth ? `+${formatCompactAudience(periodGrowth).compact}` : "0" : "—"} support={recoveryAvailable ? "New participants (last 30 days)" : "Temporarily unavailable"} icon={<TrendingUp size={19}/>} tone="#a78bfa">{recoveryAvailable && <span className="metric-source">Recovery Pass only</span>}</MetricCard>
      <MetricCard label="Recovery Readiness" value={readiness===null?"—":`${readiness}%`} support={data.recoveryReadiness.state} icon={<CircleDashed size={19}/>} tone="#818cf8">{readiness!==null&&<DashboardProgressRing value={readiness} label="Recovery readiness" tone="violet"/>}</MetricCard>
    </section>

    <AudienceUpdates availability={data.availability?.audienceUpdates} summary={data.audienceUpdates ?? { periodDays: 30, updatesSent: 0, audienceReached: 0, openRate: null, clickRate: null, drafts: 0, scheduled: 0, nextScheduled: null, recent: [], byPlatform: [] }}/>

    <section className="premium-insights-grid">
      {recoveryAvailable ? <RecoveryAudienceChart summaries={ranges} recoveryPassUrl={data.recoveryPass.canonicalUrl}/> : <article className="premium-dashboard-panel premium-empty-state"><CircleDashed size={24}/><strong>Audience growth unavailable</strong><p>We could not load Recovery Pass activity right now.</p></article>}
      <article className="premium-dashboard-panel top-destinations" aria-labelledby="top-destinations-title"><div><p className="premium-eyebrow">Recovery Pass</p><h2 id="top-destinations-title">Top Destinations</h2><p>By Recovery Pass opt-ins</p></div>{!destinationsAvailable ? <div className="premium-empty-state"><CircleDashed size={24}/><strong>Destination activity unavailable</strong><p>We could not load destination opt-ins right now.</p></div> : destinations.length ? <ol>{destinations.slice(0, 5).map((destination, index) => <li key={destination.destinationId}><span className="destination-rank">{String(index + 1).padStart(2, "0")}</span><PlatformBrandIcon provider={destination.provider} label={platformPresentation[destination.provider]?.label ?? destination.provider} size="sm"/><span><strong>{platformPresentation[destination.provider]?.label ?? destination.provider}{destination.role === "backup" ? " Backup" : ""}</strong><small>{destination.displayName}</small></span><span className="destination-row-count"><b>{exact(destination.recoveryPassOptIns)}</b><small>opt-ins</small></span></li>)}</ol> : <div className="premium-empty-state"><ShieldCheck size={24}/><strong>No destination opt-ins yet</strong><p>Counts will appear after followers select destinations through your Recovery Pass.</p></div>}</article>
    </section>

    <section className="premium-dashboard-section" aria-labelledby="recovery-destinations-title"><div className="premium-section-heading"><div><p className="premium-eyebrow">Your recovery network</p><h2 id="recovery-destinations-title">Your Recovery Accounts</h2><p>The accounts your audience can find if your primary account becomes unavailable.</p></div><Link href="/dashboard/platforms" className={manageAccountsClass}>Manage accounts</Link></div>{!destinationsAvailable ? <div className="premium-empty-state large"><CircleDashed size={28}/><strong>Recovery accounts unavailable</strong><p>We could not load your recovery accounts right now.</p></div> : destinations.length ? <div className="recovery-destination-grid">{destinations.map((destination) => { const presentation = platformPresentation[destination.provider] ?? { label: destination.provider, color: "#a78bfa" }; return <article key={destination.destinationId} className="recovery-destination-card" style={{ "--provider-accent": presentation.color } as React.CSSProperties}><div className="destination-card-top"><PlatformBrandIcon provider={destination.provider} label={presentation.label}/><span className={`destination-status status-${destination.verificationState}`}><i/>{destination.verificationState === "verified" ? "Ready" : destination.verificationState.replaceAll("_", " ")}</span></div><p>{presentation.label}{destination.role === "backup" ? " · Backup" : ""}</p><h3>{destination.displayName}</h3>{destination.handle && <small>{destination.handle}</small>}<div className="destination-opt-ins"><strong>{exact(destination.recoveryPassOptIns)}</strong><span>Recovery Pass opt-ins</span></div>{destination.recoveryPassOptIns === 0 && <p className="destination-guidance">Share your Recovery Pass to grow this recovery account.</p>}<Link href={destination.href} className={`${focus} destination-manage`}>Manage <ArrowRight size={13}/></Link></article>; })}</div> : <div className="premium-empty-state large"><ShieldCheck size={28}/><strong>Add your first recovery account</strong><p>Connect a Backup account or verified recovery account, then share your Recovery Pass.</p><Link href="/dashboard/platforms" className={`${focus} premium-primary-action`}>Add account <ArrowRight size={14}/></Link></div>}</section>

    <section className="main-account-context" aria-labelledby="main-accounts-title"><div className="premium-section-heading"><div><p className="premium-eyebrow">Context only</p><h2 id="main-accounts-title">Your Main Accounts</h2><p>These are your primary platforms. Native platform counts are shown for context and are not part of your Protected Audience.</p></div><Link href="/dashboard/platforms" className={manageAccountsClass}>Manage accounts</Link></div>{official.length ? <div className="main-account-grid">{official.map((account) => { const presentation = platformPresentation[account.provider] ?? { label: account.provider, color: "#a1a1aa", unit: null }; return <article key={account.accountKey}><PlatformBrandIcon provider={account.provider} label={presentation.label}/><span><strong>{presentation.label}</strong><small>{account.displayName}</small></span><div><b>{account.audienceCount === null ? "—" : exact(account.audienceCount)}</b><small>{account.audienceUnit ?? presentation.unit ?? "followers"}</small></div><span className="context-status"><CheckCircle2 size={13}/>{account.connectionLabel}</span></article>; })}</div> : <div className="context-empty">No Main account is currently selected. Persistent Backup destinations remain attached to your recovery network.</div>}</section>
  </div>;
}

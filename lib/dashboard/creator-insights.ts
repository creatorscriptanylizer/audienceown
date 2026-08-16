import type { CreatorDashboardData } from "./creator-dashboard";
import { platformPresentation } from "./platform-presentation";

export type CreatorInsight = {
  id: string;
  category: "recovery" | "growth" | "updates" | "scheduling" | "connection" | "readiness" | "onboarding" | "stability";
  priority: "critical" | "high" | "medium" | "low";
  tone: "warning" | "positive" | "neutral" | "informational";
  title: string;
  message: string;
  action?: { label: string; href: string };
  metadata?: Record<string, string | number | boolean>;
};

const number = new Intl.NumberFormat("en-US");
const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
const milestones = new Set([10, 25, 50, 100, 250, 500, 1_000, 5_000, 10_000]);

function growthFor(data: CreatorDashboardData, range: "7d" | "30d") {
  const summary = data.recoveryAudienceRanges?.[range] ?? data.recoveryAudience;
  const points = summary.growth.points;
  return points.length > 1 ? Math.max(0, points.at(-1)!.protectedAudience - points[0].protectedAudience) : 0;
}

function utcDay(value: string) {
  return value.slice(0, 10);
}

function nextUtcDay(value: string) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** Selects one truthful insight from already-assembled dashboard facts. It performs no I/O. */
export function getCreatorInsight(data: CreatorDashboardData): CreatorInsight {
  const recoveryAvailable = data.availability?.recoveryAudience.status !== "unavailable";
  const destinationsAvailable = data.availability?.recoveryDestinations.status !== "unavailable";
  const updatesAvailable = data.availability?.audienceUpdates.status !== "unavailable";
  const account = (data.dashboardAccounts ?? []).find((item) => item.actionRequired);
  if (account) {
    const provider = platformPresentation[account.provider]?.label ?? account.provider;
    return { id: `connection-${account.provider}`, category: "connection", priority: "critical", tone: "warning", title: `${provider} needs your attention`, message: "Restore this connection. Your existing recovery destinations remain intact.", action: { label: "Manage accounts", href: account.href }, metadata: { provider: account.provider } };
  }

  const destination = destinationsAvailable ? (data.recoveryDestinations ?? []).find((item) => item.verificationState !== "verified") : undefined;
  if (destination) {
    return { id: `destination-${destination.destinationId}`, category: "recovery", priority: "critical", tone: "warning", title: "One recovery destination needs attention", message: "Fix it so your audience still has a reliable backup path.", action: { label: "Manage destinations", href: destination.href }, metadata: { provider: destination.provider, state: destination.verificationState } };
  }

  const scheduled = updatesAvailable ? data.audienceUpdates?.nextScheduled : undefined;
  if (scheduled) {
    const scheduledDay = utcDay(scheduled.occurredAt);
    const today = utcDay(data.calculatedAt);
    const relative = scheduledDay === today ? "today" : scheduledDay === nextUtcDay(data.calculatedAt) ? "tomorrow" : null;
    if (relative) return { id: `scheduled-${scheduled.id}`, category: "scheduling", priority: "high", tone: "informational", title: `You have an audience update scheduled ${relative}`, message: `“${scheduled.title}” is scheduled for ${time.format(new Date(scheduled.occurredAt))} UTC.`, action: { label: "Review update", href: `/dashboard/updates/${scheduled.id}` }, metadata: { updateId: scheduled.id, scheduledTitle: scheduled.title, scheduledFor: scheduled.occurredAt, scheduledRelative: relative } };
  }

  const protectedAudience = data.recoveryAudience.protectedAudience;
  const growth7d = growthFor(data, "7d");
  if (recoveryAvailable && protectedAudience === 1) return { id: "first-protected-fan", category: "recovery", priority: "high", tone: "positive", title: "Your recovery network has started", message: "Your first protected fan has joined through your Recovery Pass.", action: { label: "View audience", href: "/dashboard/audience" }, metadata: { protectedAudience } };

  if (recoveryAvailable && milestones.has(protectedAudience)) return { id: `protected-audience-${protectedAudience}`, category: "growth", priority: "high", tone: "positive", title: `${number.format(protectedAudience)} people are now part of your recovery network`, message: "Keep sharing your Recovery Pass to grow beyond any single platform.", action: { label: "View audience", href: "/dashboard/audience" }, metadata: { protectedAudience, growth7d } };

  if (recoveryAvailable && growth7d > 0) return { id: "recovery-growth-7d", category: "growth", priority: "medium", tone: "positive", title: "Your protected audience is growing", message: `${number.format(growth7d)} new ${growth7d === 1 ? "person has" : "people have"} joined your recovery network in the last 7 days.`, action: { label: "View growth", href: "/dashboard/audience" }, metadata: { protectedAudience, growth7d } };

  const readiness = data.recoveryReadiness.score;
  if (readiness !== null && readiness >= 80) {
    const incomplete = data.recoveryReadiness.checklist.find((item) => item.status === "incomplete");
    return { id: readiness === 100 ? "recovery-ready" : "recovery-almost-ready", category: "readiness", priority: "medium", tone: "positive", title: readiness === 100 ? "Your recovery setup is ready" : "You’re almost fully recovery-ready", message: readiness === 100 ? "Your audience has a complete recovery path if something goes wrong." : `Your recovery setup is ${readiness}% complete.`, action: { label: "Review setup", href: incomplete?.href ?? "/dashboard/platforms" }, metadata: { readiness } };
  }

  const recentDelivery = updatesAvailable ? data.audienceUpdates?.recent.find((item) => item.wasSent && item.deliveredCount > 0) : undefined;
  if (recentDelivery) return { id: `delivered-${recentDelivery.id}`, category: "updates", priority: "medium", tone: "positive", title: `Your latest update recorded ${number.format(recentDelivery.deliveredCount)} confirmed ${recentDelivery.deliveredCount === 1 ? "delivery" : "deliveries"}`, message: "Your most recent broadcast has confirmed delivery activity.", action: { label: "View history", href: "/dashboard/updates" }, metadata: { updateId: recentDelivery.id, deliveredCount: recentDelivery.deliveredCount } };

  const drafts = updatesAvailable ? data.audienceUpdates?.drafts ?? 0 : 0;
  if (drafts > 0) return { id: "update-drafts", category: "scheduling", priority: "low", tone: "informational", title: `You have ${number.format(drafts)} ${drafts === 1 ? "draft" : "drafts"} ready to finish`, message: `${drafts === 1 ? "Complete it" : "Complete them"} when you’re ready to send your next audience update.`, action: { label: "View drafts", href: "/dashboard/updates?filter=draft" }, metadata: { drafts } };

  const top = destinationsAvailable ? [...(data.recoveryDestinations ?? [])].filter((item) => item.recoveryPassOptIns > 0).sort((a, b) => b.recoveryPassOptIns - a.recoveryPassOptIns)[0] : undefined;
  const runnerUp = destinationsAvailable ? [...(data.recoveryDestinations ?? [])].filter((item) => item.destinationId !== top?.destinationId).sort((a, b) => b.recoveryPassOptIns - a.recoveryPassOptIns)[0] : undefined;
  if (top && top.recoveryPassOptIns >= 3 && top.recoveryPassOptIns > (runnerUp?.recoveryPassOptIns ?? 0)) {
    const provider = platformPresentation[top.provider]?.label ?? top.provider;
    return { id: `top-destination-${top.destinationId}`, category: "recovery", priority: "low", tone: "informational", title: `${provider}${top.role === "backup" ? " Backup" : ""} is your strongest recovery destination`, message: `${number.format(top.recoveryPassOptIns)} Recovery Pass ${top.recoveryPassOptIns === 1 ? "participant selected" : "participants selected"} it.`, action: { label: "Manage destinations", href: top.href }, metadata: { provider: top.provider, optIns: top.recoveryPassOptIns } };
  }

  if (recoveryAvailable && protectedAudience === 0 && data.recoveryAudience.recoveryConnections === 0) return { id: "recovery-onboarding", category: "onboarding", priority: "low", tone: "informational", title: "Build a direct connection with your audience", message: "Share your Recovery Pass so followers can choose where to find you beyond any single platform.", action: { label: "Share Recovery Pass", href: data.recoveryPass.href }, metadata: { protectedAudience: 0, recoveryConnections: 0 } };

  if (!recoveryAvailable) return { id: "dashboard-overview", category: "stability", priority: "low", tone: "neutral", title: "Keep your recovery setup current", message: "Review your connected accounts and recovery settings whenever something changes.", action: { label: "Review setup", href: "/dashboard/platforms" } };

  return { id: "stable-recovery-network", category: "stability", priority: "low", tone: "neutral", title: "Keep your recovery network current", message: "Keep your Recovery Pass visible so new followers can join your backup network.", action: { label: "View audience", href: "/dashboard/audience" }, metadata: { protectedAudience, growth7d } };
}

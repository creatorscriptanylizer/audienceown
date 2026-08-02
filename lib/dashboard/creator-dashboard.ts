import "server-only";
import { createClient } from "@/lib/supabase/server";
import { recoveryAnalyticsOverview, recoveryTrend, liveRecoveryAnalytics, type RecoveryAnalyticsOverview } from "@/lib/recovery-analytics-server";
import { calculateProtectionScore } from "./protection-score";
import { platformPresentation } from "./platform-presentation";
import type { Creator } from "@/lib/database.helpers";
import type { LiveRecoveryAnalytics } from "@/lib/live-recovery-analytics";

export type CreatorDashboardData = Awaited<ReturnType<typeof getCreatorDashboard>>;

type QueryResult<T> = { data: T | null; error: unknown };
type DashboardRecoveryOverview = RecoveryAnalyticsOverview | {
  total_relationships: null;
  recovery_ready_relationships: null;
  uncovered_relationships: null;
  partially_configured_relationships: null;
  recovery_coverage_rate: null;
  change_vs_previous_snapshot: null;
  last_snapshot_at: null;
  availability: "unavailable";
};

function dashboardQueryData<T>(result: QueryResult<T>): T | null {
  if (result.error) throw new Error("dashboard_section_query_failed");
  return result.data;
}

export async function safeDashboardSection<T>(
  name: string,
  query: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await query();
  } catch (error) {
    const category = error instanceof Error && error.message === "analytics_unavailable"
      ? "source_unavailable"
      : "query_failed";
    console.warn(JSON.stringify({ event: "dashboard_section_unavailable", section: name, category }));
    return fallback;
  }
}

export async function getCreatorDashboard(creator: Creator) {
  const db = await createClient(); if (!db) throw new Error("dashboard_unavailable");
  const unavailableCoverage = { total_relationships: null, recovery_ready_relationships: null, uncovered_relationships: null, partially_configured_relationships: null, recovery_coverage_rate: null, change_vs_previous_snapshot: null, last_snapshot_at: null, availability: "unavailable" as const };
  const [coverage, trend, accounts, providerAssets, optIns, identityProfile, identityAccounts, trust, authenticity, monitoring, destinations, ecosystemIncidents, emergencies, plans, drills] = await Promise.all([
    safeDashboardSection<DashboardRecoveryOverview>("recovery_analytics", recoveryAnalyticsOverview, unavailableCoverage),
    safeDashboardSection("recovery_trend", () => recoveryTrend(30), []),
    safeDashboardSection("platform_metrics", async () => dashboardQueryData(await db.from("connected_accounts").select("id,platform,account_type,label,connection_health,provider_status,last_sync_at,created_at").eq("creator_id", creator.id).order("position").limit(20)) ?? [], []),
    safeDashboardSection("provider_assets", async () => dashboardQueryData(await db.from("provider_asset_bindings").select("connected_account_id,provider,verification_status,authority_status,last_successful_sync_at").eq("creator_id", creator.id).limit(50)) ?? [], []),
    safeDashboardSection("recent_opt_ins", async () => dashboardQueryData(await db.from("follower_connections").select("id,created_at,source_platform,status").eq("creator_id", creator.id).eq("status", "active").order("created_at", { ascending: false }).limit(5)) ?? [], []),
    safeDashboardSection<{ identity_status: string; identity_revision: number } | null>("identity_profile", async () => dashboardQueryData(await db.from("creator_identity_profiles").select("identity_status,identity_revision").eq("creator_id", creator.id).maybeSingle()), null),
    safeDashboardSection("identity_accounts", async () => dashboardQueryData(await db.from("creator_identity_accounts").select("provider,verification_status,official,account_kind").eq("creator_id", creator.id)) ?? [], []),
    safeDashboardSection("identity_trust", async () => dashboardQueryData(await db.from("creator_trust_evaluations").select("trust_state,evaluated_at").eq("creator_id", creator.id).order("evaluated_at", { ascending: false }).limit(1)) ?? [], []),
    safeDashboardSection<{ display_enabled: boolean; updated_at: string } | null>("authenticity", async () => dashboardQueryData(await db.from("creator_authenticity_profiles").select("display_enabled,updated_at").eq("creator_id", creator.id).maybeSingle()), null),
    safeDashboardSection("identity_monitoring", async () => dashboardQueryData(await db.from("identity_monitoring_incidents").select("status,created_at").eq("creator_id", creator.id).order("created_at", { ascending: false }).limit(20)) ?? [], []),
    safeDashboardSection("ecosystem_destinations", async () => dashboardQueryData(await db.from("creator_ecosystem_destinations").select("verification_status,sync_status,last_synced_at,automation_enabled,automation_paused_at").eq("creator_id", creator.id).limit(100)) ?? [], []),
    safeDashboardSection("ecosystem_incidents", async () => dashboardQueryData(await db.from("ecosystem_automation_incidents").select("status").eq("creator_id", creator.id).limit(100)) ?? [], []),
    safeDashboardSection("emergency_history", async () => dashboardQueryData(await db.from("creator_emergencies").select("id,title,severity,lifecycle_status,updated_at,activated_at").eq("creator_id", creator.id).in("lifecycle_status", ["active", "resolved"]).order("updated_at", { ascending: false }).limit(10)) ?? [], []),
    safeDashboardSection("emergency_plan", async () => dashboardQueryData(await db.from("emergency_plans").select("readiness_status,last_validated_at").eq("creator_id", creator.id).order("updated_at", { ascending: false }).limit(1)) ?? [], []),
    safeDashboardSection("emergency_drills", async () => dashboardQueryData(await db.from("emergency_drills").select("status,completed_at,created_at").eq("creator_id", creator.id).order("created_at", { ascending: false }).limit(1)) ?? [], []),
  ]);
  const verifiedOfficial = identityAccounts.some((account) => account.official && account.verification_status === "verified");
  const verifiedBackup = identityAccounts.some((account) => account.account_kind === "backup" && account.verification_status === "verified");
  const protection = calculateProtectionScore({ recoveryCoveragePercent: Number(coverage.recovery_coverage_rate ?? 0), recoveryPagePublished: creator.public_profile_enabled, recoveryPassEnabled: creator.recovery_pass_enabled, verifiedOfficialAccount: verifiedOfficial, verifiedBackupAccount: verifiedBackup });
  const knownTotal = coverage.total_relationships === null ? null : Number(coverage.total_relationships);
  const protectedFans = coverage.recovery_ready_relationships === null ? null : Number(coverage.recovery_ready_relationships);
  const fansAtRisk = coverage.uncovered_relationships === null || coverage.partially_configured_relationships === null
    ? null
    : Number(coverage.uncovered_relationships) + Number(coverage.partially_configured_relationships);
  const activeEmergency = emergencies.find((incident) => incident.lifecycle_status === "active") ?? null;
  const recentEmergency = activeEmergency ?? emergencies[0] ?? null;
  const liveRecovery: LiveRecoveryAnalytics | null = recentEmergency
    ? await safeDashboardSection("live_recovery_analytics", () => liveRecoveryAnalytics(recentEmergency.id), null)
    : null;
  const plan = plans[0] ?? null, drill = drills[0] ?? null;
  const checklist: Array<{ key: string; label: string; status: "complete" | "pending" | "unavailable" | "attention"; href: string }> = [
    { key: "page", label: "Recovery page published", status: creator.public_profile_enabled ? "complete" : "unavailable", href: "/dashboard/creator-page" },
    { key: "pass", label: "Recovery Pass enabled", status: creator.recovery_pass_enabled ? "complete" : "unavailable", href: "/dashboard/settings" },
    { key: "official", label: "Verified official account", status: verifiedOfficial ? "complete" : "pending", href: "/dashboard/identity" },
    { key: "backup", label: "Verified backup account", status: verifiedBackup ? "complete" : "pending", href: "/dashboard/platforms" },
    { key: "plan", label: "Emergency plan validated", status: plan?.readiness_status === "ready" ? "complete" : plan ? "attention" : "unavailable", href: "/dashboard/emergency" },
  ];
  const openEcosystem = ecosystemIncidents.filter((row) => !["resolved", "dismissed"].includes(row.status)).length;
  const lastSyncAt = destinations.map((row) => row.last_synced_at).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
  const platformKeys = Object.keys(platformPresentation);
  const platforms = platformKeys.map((provider) => {
    const account = accounts.find((row) => row.platform === provider);
    const asset = providerAssets.find((row) => row.provider === provider);
    const identity = identityAccounts.find((row) => row.provider === provider);
    const presentation = platformPresentation[provider];
    const verified = asset?.verification_status === "verified" || identity?.verification_status === "verified";
    const connected = Boolean(account || asset || identity);
    const accessLimited = asset?.authority_status === "insufficient" || asset?.authority_status === "unavailable";
    return { provider, label: presentation.label, audienceCount: null as number | null, audienceUnit: presentation.unit,
      verified, connected, accessLimited, health: account?.connection_health === "healthy" ? "healthy" as const : account?.connection_health === "degraded" ? "attention" as const : connected ? "unavailable" as const : "not_configured" as const,
      growthPercent: null, trend: null as number[] | null, updatedAt: account?.last_sync_at ?? asset?.last_successful_sync_at ?? null, color: presentation.color };
  });
  const nextAction = !creator.public_profile_enabled ? { label: "Publish your Recovery Page", description: "Make your verified recovery destination available to fans.", href: "/dashboard/creator-page", tone: "primary" as const }
    : !platforms.some((platform) => platform.connected) ? { label: "Connect your first platform", description: "Link an official account to establish your audience protection foundation.", href: "/dashboard/platforms", tone: "primary" as const }
    : !verifiedOfficial ? { label: "Verify an official account", description: "Confirm an authoritative identity your audience can trust.", href: "/dashboard/identity", tone: "warning" as const }
    : !verifiedBackup ? { label: "Add a verified backup account", description: "Give your audience an authoritative fallback destination.", href: "/dashboard/platforms", tone: "warning" as const }
    : protectedFans === 0 ? { label: "Protect your first fan", description: "Share your Recovery Pass and start building an audience you can reach directly.", href: `/c/${creator.public_slug}`, tone: "primary" as const }
    : !plan ? { label: "Configure your emergency plan", description: "Prepare the verified workflow you will use during an account emergency.", href: "/dashboard/emergency", tone: "warning" as const }
    : !drill || drill.status !== "completed" ? { label: "Run your first emergency drill", description: "Validate your recovery workflow without contacting fans.", href: "/dashboard/emergency", tone: "neutral" as const }
    : monitoring.some((row) => !["resolved", "dismissed"].includes(row.status)) ? { label: "Resolve an identity alert", description: "Review the active identity signal that needs your attention.", href: "/dashboard/identity", tone: "warning" as const }
    : { label: "Protect more fans", description: "Share your Recovery Pass with your audience.", href: `/c/${creator.public_slug}`, tone: "primary" as const };
  return { calculatedAt: new Date().toISOString(), creator: { displayName: creator.display_name, handle: creator.public_slug }, protection,
    audience: { protectedFans, fansAtRisk, protectedRatio: knownTotal && protectedFans !== null ? protectedFans * 100 / knownTotal : null, trend: trend.map((row) => ({ date: row.snapshot_date, protected: Number(row.recovery_ready_relationships), atRisk: Number(row.total_relationships) - Number(row.recovery_ready_relationships) })) },
    recoveryReadiness: { score: null as number | null, state: plan?.readiness_status ?? "Not configured", checklist },
    platforms,
    recentOptIns: optIns.map((row) => ({ id: row.id, displayLabel: "New protected fan", sourceLabel: row.source_platform, occurredAt: row.created_at })),
    identity: { trustState: trust[0]?.trust_state ?? (identityProfile?.identity_status === "verified" ? "Verified" : "Not verified"), authenticityState: authenticity?.display_enabled ? "Issued" : "Not issued", monitoringState: monitoring.some((row) => !["resolved", "dismissed"].includes(row.status)) ? "Needs attention" : "Healthy", verifiedAccounts: identityAccounts.filter((account) => account.verification_status === "verified").length, revision: identityProfile?.identity_revision ?? null },
    ecosystem: { verifiedDestinations: destinations.filter((row) => row.verification_status === "verified").length, activeAutomations: destinations.filter((row) => row.automation_enabled && !row.automation_paused_at).length, openIncidents: openEcosystem, lastSyncAt, health: openEcosystem ? "Needs attention" : destinations.length ? "Healthy" : "Setup available" },
    emergency: { activeEmergencyId: activeEmergency?.id ?? null, activeEmergencyCount: activeEmergency ? 1 : 0, status: activeEmergency ? "Active incident" : "No active emergency", severity: activeEmergency?.severity ?? null, activatedAt: activeEmergency?.activated_at ?? null, recoveryPassActive: creator.recovery_pass_enabled, lastDrillAt: drill?.completed_at ?? null, readinessState: plan?.readiness_status ?? "Not configured" }, liveRecovery, nextAction };
}

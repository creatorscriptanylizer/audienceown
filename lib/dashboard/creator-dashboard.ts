import "server-only";
import { createClient } from "@/lib/supabase/server";
import { recoveryAnalyticsOverview, liveRecoveryAnalytics, type RecoveryAnalyticsOverview } from "@/lib/recovery-analytics-server";
import { emptyRecoveryAudienceSummary, parseRecoveryAudienceSummary, type RecoveryAudienceRange, type RecoveryAudienceSummary } from "@/lib/recovery-audience";
import { calculateProtectionScore } from "./protection-score";
import { platformPresentation } from "./platform-presentation";
import type { Creator } from "@/lib/database.helpers";
import type { LiveRecoveryAnalytics } from "@/lib/live-recovery-analytics";
import { providerAudienceCapabilities } from "@/lib/platform-audience/capabilities";
import type { AudienceProvider, PlatformAudienceMetricStatus } from "@/lib/platform-audience/types";
import { resolveProviderConnection } from "./provider-connections";
import { getCreatorProviderAccounts } from "@/lib/social-providers/creator-provider-accounts";
import { creatorAccountKey } from "@/lib/social-providers/creator-account-projection";
import { canonicalRecoveryPassUrl, displayRecoveryPassUrl } from "@/lib/recovery-pass";
import { canonicalAccountConnected, resolveConnectionStatus } from "@/lib/social-providers/connection-health";
import { listSocialProviders } from "@/lib/social-providers/registry";
import { appUrl } from "@/lib/app-url";
import { providerConnectionCapability } from "@/lib/social-providers/connection-capabilities";
import { providerReadiness } from "@/lib/social-providers/readiness";
import { emptyAudienceUpdatesSummary, getAudienceUpdatesSummary } from "./audience-updates";
import { calculateRecoveryReadiness } from "@/lib/recovery-readiness";

type CreatorDashboardResult = Awaited<ReturnType<typeof getCreatorDashboard>>;
type OptionalDashboardFields="mainAudience"|"mainAccountState"|"recoveryDestinations"|"dashboardAccounts"|"unassignedBackups"|"nativeOfficialAudience"|"nativeOfficialAudienceAccountCount"|"connectedProviders"|"availableProviders";
export type CreatorDashboardData=Omit<CreatorDashboardResult,OptionalDashboardFields>&Partial<Pick<CreatorDashboardResult,OptionalDashboardFields>>&{
  /** @deprecated Native account totals are contextual and are never a recovery metric. */
  combinedOfficialAudience?: number;
  /** @deprecated Native account totals are contextual and are never a recovery metric. */
  officialAudienceAccountCount?: number;
};

export type DashboardDataAvailability =
  | { status: "available" }
  | { status: "unavailable"; reason: "query_failed" };

export type DashboardAvailability = {
  recoveryAudience: DashboardDataAvailability;
  recoveryDestinations: DashboardDataAvailability;
  audienceUpdates: DashboardDataAvailability;
};

type DashboardSectionState<T> = {
  data: T;
  availability: DashboardDataAvailability;
};

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
  if (result.error) throw result.error;
  return result.data;
}

const dashboardSources: Record<string, string> = {
  audience_metrics: "provider_audience_metrics", recovery_destinations: "get_creator_recovery_destination_breakdown",
  recovery_audience: "get_creator_recovery_audience_summary", recent_opt_ins: "get_creator_recent_recovery_opt_ins",
  identity_profile: "creator_identity_profiles", identity_trust: "creator_trust_evaluations", authenticity: "creator_authenticity_profiles",
  identity_monitoring: "identity_monitoring_incidents", ecosystem_destinations: "creator_ecosystem_destinations",
  ecosystem_incidents: "ecosystem_automation_incidents", emergency_history: "creator_emergencies",
  emergency_plan: "emergency_plans", emergency_drills: "emergency_drills",
  audience_updates: "creator_updates + update_deliveries",
};

const loggedDashboardFailures = new Set<string>();
function safeDatabaseError(value: unknown) {
  const error = value && typeof value === "object" ? value as { code?: unknown; message?: unknown; hint?: unknown } : {};
  const sanitize = (text: unknown) => typeof text === "string" ? text.slice(0, 240).replaceAll(/https?:\/\/\S+/g, "[url]").replaceAll(/[\w.+-]+@[\w.-]+/g, "[email]").replaceAll(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "[id]") : null;
  const code = typeof error.code === "string" ? error.code : null;
  return { code, message: code ? sanitize(error.message) : null, hint: code ? sanitize(error.hint) : null };
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
    const details = safeDatabaseError(error);
    const fingerprint = `${name}:${details.code}:${details.message}`;
    if (process.env.NODE_ENV !== "development" || !loggedDashboardFailures.has(fingerprint)) {
      console.warn(JSON.stringify({ event: "dashboard_section_unavailable", section: name, source: dashboardSources[name] ?? name, category, ...details }));
      if (process.env.NODE_ENV === "development") loggedDashboardFailures.add(fingerprint);
    }
    return fallback;
  }
}

export async function safeDashboardSectionState<T>(
  name: string,
  query: () => Promise<T>,
  fallback: T,
): Promise<DashboardSectionState<T>> {
  const failed = Symbol(name);
  const result = await safeDashboardSection<T | typeof failed>(name, query, failed);
  return result === failed
    ? { data: fallback, availability: { status: "unavailable", reason: "query_failed" } }
    : { data: result, availability: { status: "available" } };
}

export async function getCreatorDashboard(creator: Creator) {
  const db = await createClient(); if (!db) throw new Error("dashboard_unavailable");
  const unavailableCoverage = { total_relationships: null, recovery_ready_relationships: null, uncovered_relationships: null, partially_configured_relationships: null, recovery_coverage_rate: null, change_vs_previous_snapshot: null, last_snapshot_at: null, availability: "unavailable" as const };
  const recoveryRanges: RecoveryAudienceRange[] = ["7d", "30d", "90d", "all"];
  const [coverage, recoveryAudienceState, providerAccountResult, audienceMetrics, recoveryDestinationsState, optIns, identityProfile, trust, authenticity, monitoring, destinations, ecosystemIncidents, emergencies, plansState, drills, audienceUpdatesState] = await Promise.all([
    safeDashboardSection<DashboardRecoveryOverview>("recovery_analytics", recoveryAnalyticsOverview, unavailableCoverage),
    safeDashboardSectionState<Record<RecoveryAudienceRange, RecoveryAudienceSummary>>("recovery_audience", async () => {
      const summaries = await Promise.all(recoveryRanges.map(async (range) => parseRecoveryAudienceSummary(
        dashboardQueryData(await db.rpc("get_creator_recovery_audience_summary", { p_creator_id: creator.id, p_range: range })), range,
      )));
      return Object.fromEntries(recoveryRanges.map((range, index) => [range, summaries[index]])) as Record<RecoveryAudienceRange, RecoveryAudienceSummary>;
    }, Object.fromEntries(recoveryRanges.map((range) => [range, emptyRecoveryAudienceSummary(range)])) as Record<RecoveryAudienceRange, RecoveryAudienceSummary>),
    getCreatorProviderAccounts(db, creator.id),
    safeDashboardSection("audience_metrics", async () => dashboardQueryData(await db.from("provider_audience_metrics")
      .select("connection_id,provider,account_category,audience_count,audience_unit,status,approximate,source_observed_at,synchronized_at,next_sync_at")
      .eq("creator_id", creator.id)) ?? [], []),
    safeDashboardSectionState("recovery_destinations", async () => dashboardQueryData(await db.rpc("get_creator_recovery_destination_breakdown")) ?? [], []),
    safeDashboardSection("recent_opt_ins", async () => dashboardQueryData(await db.rpc("get_creator_recent_recovery_opt_ins", { p_limit: 5 })) ?? [], []),
    safeDashboardSection<{ identity_status: string; identity_revision: number } | null>("identity_profile", async () => dashboardQueryData(await db.from("creator_identity_profiles").select("identity_status,identity_revision").eq("creator_id", creator.id).maybeSingle()), null),
    safeDashboardSection("identity_trust", async () => dashboardQueryData(await db.from("creator_trust_evaluations").select("trust_state,evaluated_at").eq("creator_id", creator.id).order("evaluated_at", { ascending: false }).limit(1)) ?? [], []),
    safeDashboardSection<{ display_enabled: boolean; updated_at: string } | null>("authenticity", async () => dashboardQueryData(await db.from("creator_authenticity_profiles").select("display_enabled,updated_at").eq("creator_id", creator.id).maybeSingle()), null),
    safeDashboardSection("identity_monitoring", async () => dashboardQueryData(await db.from("identity_monitoring_incidents").select("status,created_at").eq("creator_id", creator.id).order("created_at", { ascending: false }).limit(20)) ?? [], []),
    safeDashboardSection("ecosystem_destinations", async () => dashboardQueryData(await db.from("creator_ecosystem_destinations").select("verification_status,sync_status,last_synced_at,automation_enabled,automation_paused_at").eq("creator_id", creator.id).limit(100)) ?? [], []),
    safeDashboardSection("ecosystem_incidents", async () => dashboardQueryData(await db.from("ecosystem_automation_incidents").select("status").eq("creator_id", creator.id).limit(100)) ?? [], []),
    safeDashboardSection("emergency_history", async () => dashboardQueryData(await db.from("creator_emergencies").select("id,title,severity,lifecycle_status,updated_at,activated_at").eq("creator_id", creator.id).in("lifecycle_status", ["active", "resolved"]).order("updated_at", { ascending: false }).limit(10)) ?? [], []),
    safeDashboardSectionState("emergency_plan", async () => dashboardQueryData(await db.from("emergency_plans").select("readiness_status,last_validated_at").eq("creator_id", creator.id).order("updated_at", { ascending: false }).limit(1)) ?? [], []),
    safeDashboardSection("emergency_drills", async () => dashboardQueryData(await db.from("emergency_drills").select("status,completed_at,created_at").eq("creator_id", creator.id).order("created_at", { ascending: false }).limit(1)) ?? [], []),
    safeDashboardSectionState("audience_updates", () => getAudienceUpdatesSummary(db, creator.id), emptyAudienceUpdatesSummary),
  ]);
  const recoveryAudienceRanges = recoveryAudienceState.data;
  const recoveryDestinations = recoveryDestinationsState.data;
  const audienceUpdates = audienceUpdatesState.data;
  const recoveryAudience = recoveryAudienceRanges["30d"];
  const { connections: accounts, assets: providerAssets, identities: identityAccounts, accounts: accountProjection, mainAccount: canonicalMainAccount, backupAccounts: canonicalBackupAccounts } = providerAccountResult;
  const verifiedOfficial = identityAccounts.some((account) => account.official && account.verification_status === "verified");
  const verifiedBackup = identityAccounts.some((account) => account.account_kind === "backup" && account.verification_status === "verified");
  const protection = calculateProtectionScore({ recoveryCoveragePercent: Number(coverage.recovery_coverage_rate ?? 0), recoveryPagePublished: creator.public_profile_enabled, recoveryPassEnabled: creator.recovery_pass_enabled, verifiedOfficialAccount: verifiedOfficial, verifiedBackupAccount: verifiedBackup });
  const protectedFans = recoveryAudience.protectedAudience;
  const fansAtRisk = coverage.uncovered_relationships === null || coverage.partially_configured_relationships === null
    ? null
    : Number(coverage.uncovered_relationships) + Number(coverage.partially_configured_relationships);
  const activeEmergency = emergencies.find((incident) => incident.lifecycle_status === "active") ?? null;
  const recentEmergency = activeEmergency ?? emergencies[0] ?? null;
  const liveRecovery: LiveRecoveryAnalytics | null = recentEmergency
    ? await safeDashboardSection("live_recovery_analytics", () => liveRecoveryAnalytics(recentEmergency.id), null)
    : null;
  const plans=plansState.data;
  const plan = plans[0] ?? null, drill = drills[0] ?? null;
  const recoveryReadiness=calculateRecoveryReadiness({
    page:creator.public_profile_enabled?"complete":"incomplete",
    pass:creator.recovery_pass_enabled?"complete":"incomplete",
    official:verifiedOfficial?"complete":"incomplete",
    backup:verifiedBackup?"complete":"incomplete",
    plan:plansState.availability.status==="unavailable"?"unavailable":plan?.readiness_status==="ready"?"complete":"incomplete",
  });
  const openEcosystem = ecosystemIncidents.filter((row) => !["resolved", "dismissed"].includes(row.status)).length;
  const lastSyncAt = destinations.map((row) => row.last_synced_at).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
  const platformKeys = Object.keys(platformPresentation);
  const platforms = platformKeys.map((provider) => {
    const account = accounts.find((row) => row.platform === provider && row.account_type === "official" && row.is_primary)
      ?? accounts.find((row) => row.platform === provider && row.account_type === "official")
      ?? accounts.find((row) => row.platform === provider);
    const asset = providerAssets.find((row) => row.provider === provider);
    const presentation = platformPresentation[provider];
    const audienceMetric = account
      ? audienceMetrics.find((row) => row.connection_id === account.id && row.account_category === "official")
      : undefined;
    const capability = providerAudienceCapabilities[provider as keyof typeof providerAudienceCapabilities];
    const projectedAccounts = accountProjection.filter((row) => row.provider === provider && !row.archived);
    const projectedConnected = projectedAccounts.some((row) => row.connected);
    const projectedVerified = projectedAccounts.some((row) => row.verified);
    const projectedAttention = projectedAccounts.some((row) => row.needsAttention);
    const projectedRevoked = projectedAccounts.length > 0 && projectedAccounts.every((row) => row.revoked);
    const connection = projectedAccounts.length ? { provider: provider as keyof typeof providerAudienceCapabilities, connected: projectedConnected, verified: projectedVerified, selectedAsset: projectedAccounts.some((row) => providerAssets.some((asset) => asset.connected_account_id === accounts.find((account) => account.platform === row.provider)?.id)), status: !projectedConnected ? projectedRevoked ? "revoked" as const : "not_connected" as const : projectedAttention ? "attention" as const : projectedVerified ? "verified" as const : "connected" as const } : resolveProviderConnection(provider as keyof typeof providerAudienceCapabilities, accounts, providerAssets, identityAccounts);
    const { verified, connected } = connection;
    const accessLimited = asset?.authority_status === "insufficient" || asset?.authority_status === "unavailable";
    const metricStatus: PlatformAudienceMetricStatus = audienceMetric?.status as PlatformAudienceMetricStatus ?? (!connected ? "not_connected" : capability.requiresSelectedAsset && !asset ? "not_selected" : !capability.supported ? "unsupported" : accessLimited ? "permission_required" : capability.accessRequirement === "review" ? "review_required" : "unsupported");
    return { provider, label: presentation.label, audienceCount: audienceMetric?.audience_count === null || audienceMetric?.audience_count === undefined ? null : Number(audienceMetric.audience_count), audienceUnit: audienceMetric?.audience_unit ?? capability.audienceUnit,
      verified, connected, accessLimited, health: account?.connection_health === "healthy" ? "healthy" as const : account?.connection_health === "degraded" ? "attention" as const : connected ? "unavailable" as const : "not_configured" as const,
      metricStatus, approximate: audienceMetric?.approximate ?? false, synchronizedAt: audienceMetric?.source_observed_at ?? null,
      growthPercent: null, trend: null, href: "/dashboard/platforms", updatedAt: audienceMetric?.source_observed_at ?? account?.last_sync_at ?? asset?.last_successful_sync_at ?? null, color: presentation.color };
  });
  const activeAccounts = accountProjection.filter((row) => row.connected && !row.archived && !row.revoked);
  const activeAccountKeys = new Set(activeAccounts.map((row) => row.accountKey));
  // Keep disconnected accounts visible so each account can report its own health.
  // Revoked and archived accounts remain outside the dashboard projection.
  const visibleDashboardAccounts=accountProjection.filter((row)=>!row.archived&&!row.revoked);
  const projectedDashboardAccounts=visibleDashboardAccounts.map((projected)=>{
    const connection=accounts.find((row)=>creatorAccountKey(creator.id,row.id)===projected.accountKey);
    const metric=connection?audienceMetrics.find((row)=>row.connection_id===connection.id&&row.account_category===(projected.role==="official"?"official":"backup")):undefined;
    const canonicalConnected=canonicalAccountConnected({health:connection?.connection_health,providerStatus:connection?.provider_status,hasPublicUrl:Boolean(connection?.url),hasExternalAccountId:Boolean(connection?.external_account_id)});
    const status=resolveConnectionStatus({health:connection?.connection_health,providerStatus:connection?.provider_status,canonicalConnected});
    const protectedOfficialAccountKey=connection?.protected_official_account_id?creatorAccountKey(creator.id,connection.protected_official_account_id):null;
    return{accountKey:projected.accountKey,...(protectedOfficialAccountKey?{protectedOfficialAccountKey}:{}),provider:projected.provider,displayName:projected.displayName,handle:projected.handle,role:projected.role,audienceCount:metric?.audience_count===null||metric?.audience_count===undefined?null:Number(metric.audience_count),audienceUnit:metric?.audience_unit??platformPresentation[projected.provider]?.unit??null,audienceStatus:metric?.status as PlatformAudienceMetricStatus|undefined,synchronizedAt:metric?.source_observed_at??projected.lastSynchronizedAt,connectionLabel:status.connectionLabel,connectionTone:status.connectionTone,actionRequired:status.actionRequired,capabilityNotice:status.capabilityNotice,href:"/dashboard/platforms"};
  });
  const backupAccountKeys=new Set(canonicalBackupAccounts.map((account)=>account.accountKey));
  const backupAccounts=projectedDashboardAccounts.filter((account)=>account.role==="backup"&&backupAccountKeys.has(account.accountKey));
  const dashboardAccounts=projectedDashboardAccounts.filter((account)=>account.role==="official"&&activeAccountKeys.has(account.accountKey)).map((official)=>({
    ...official,
    linkedBackups:official.accountKey===canonicalMainAccount?.accountKey?backupAccounts:[],
  }));
  const unassignedBackups=canonicalMainAccount?[]:backupAccounts;
  const officialAccounts=dashboardAccounts;
  const nativeOfficialAudience=officialAccounts.reduce((sum,account)=>sum+(account.audienceCount??0),0);
  const nativeOfficialAudienceAccountCount=officialAccounts.filter((account)=>account.audienceCount!==null).length;
  const connectedProviders=[...new Set(projectedDashboardAccounts.map((account)=>account.provider))];
  const availableProviders=listSocialProviders().map((adapter)=>providerConnectionCapability(adapter,providerReadiness(adapter).connectionAvailable)).filter((capability)=>!connectedProviders.includes(capability.provider as AudienceProvider)&&capability.connectable).map((capability)=>({provider:capability.provider,displayName:capability.displayName}));
  const mainCandidate = canonicalMainAccount;
  const mainAccountState = mainCandidate ? "selected" as const : activeAccounts.length ? "selection_required" as const : "not_connected" as const;
  const mainProvider = mainCandidate?.provider as keyof typeof providerAudienceCapabilities | undefined;
  const mainPlatform = mainProvider ? platforms.find((row) => row.provider === mainProvider) ?? null : null;
  const mainAudience = mainCandidate && mainProvider && mainPlatform ? {
    provider: mainProvider,
    displayName: mainCandidate.displayName,
    handle: mainCandidate.handle,
    audienceCount: mainPlatform.audienceCount,
    audienceUnit: mainPlatform.audienceUnit,
    status: mainPlatform.metricStatus,
    approximate: mainPlatform.approximate,
    synchronizedAt: mainPlatform.synchronizedAt,
    connection: { provider: mainProvider, connected: mainCandidate.connected, verified: mainCandidate.verified, selectedAsset: providerAssets.some((asset) => asset.provider === mainProvider), status: mainCandidate.revoked ? "revoked" as const : mainCandidate.needsAttention ? "attention" as const : mainCandidate.verified ? "verified" as const : "connected" as const },
    href: "/dashboard/platforms",
  } : null;
  const nextAction = !creator.public_profile_enabled ? { label: "Publish your Recovery Page", description: "Make your verified recovery destination available to fans.", href: "/dashboard/creator-page", tone: "primary" as const }
    : !platforms.some((platform) => platform.connected) ? { label: "Connect your first platform", description: "Link an official account to establish your audience protection foundation.", href: "/dashboard/platforms", tone: "primary" as const }
    : !verifiedOfficial ? { label: "Verify an official account", description: "Confirm an authoritative identity your audience can trust.", href: "/dashboard/identity", tone: "warning" as const }
    : !verifiedBackup ? { label: "Add a verified backup account", description: "Give your audience an authoritative fallback destination.", href: "/dashboard/platforms", tone: "warning" as const }
    : protectedFans === 0 ? { label: "Protect your first fan", description: "Share your Recovery Pass and start building an audience you can reach directly.", href: `/c/${creator.public_slug}`, tone: "primary" as const }
    : !plan ? { label: "Configure your emergency plan", description: "Prepare the verified workflow you will use during an account emergency.", href: "/dashboard/emergency", tone: "warning" as const }
    : !drill || drill.status !== "completed" ? { label: "Run your first emergency drill", description: "Validate your recovery workflow without contacting fans.", href: "/dashboard/emergency", tone: "neutral" as const }
    : monitoring.some((row) => !["resolved", "dismissed"].includes(row.status)) ? { label: "Resolve an identity alert", description: "Review the active identity signal that needs your attention.", href: "/dashboard/identity", tone: "warning" as const }
    : { label: "Protect more fans", description: "Share your Recovery Pass with your audience.", href: `/c/${creator.public_slug}`, tone: "primary" as const };
  const publicSlug=creator.public_slug;
  const recoveryPassExists=Boolean(publicSlug&&creator.recovery_pass_enabled);
  const recoveryPassOrigin=appUrl();
  const recoveryPassName=(creator as Creator&{recovery_pass_name?:string|null}).recovery_pass_name??`${creator.display_name}'s Recovery Pass`;
  const recoveryPass=recoveryPassExists&&publicSlug?{exists:true as const,active:Boolean(creator.public_profile_enabled),canonicalUrl:canonicalRecoveryPassUrl(recoveryPassOrigin,publicSlug),displayUrl:displayRecoveryPassUrl(recoveryPassOrigin,publicSlug),href:`/${encodeURIComponent(publicSlug)}`,name:recoveryPassName}:{exists:false as const,active:false,canonicalUrl:null,displayUrl:null,href:"/onboarding/recovery-pass",name:recoveryPassName};
  return { calculatedAt: new Date().toISOString(), creator: { displayName: creator.display_name, handle: creator.public_slug }, recoveryPass, protection,
    availability: {
      recoveryAudience: recoveryAudienceState.availability,
      recoveryDestinations: recoveryDestinationsState.availability,
      audienceUpdates: audienceUpdatesState.availability,
    } satisfies DashboardAvailability,
    recoveryAudience, recoveryAudienceRanges, audienceUpdates,
    audience: { protectedFans, fansAtRisk, protectedRatio: null, trend: recoveryAudience.growth.points.map((point) => ({ date: point.date, protected: point.protectedAudience, recoveryConnections: point.recoveryConnections, atRisk: 0 })) },
    recoveryReadiness,
    platforms, dashboardAccounts, unassignedBackups, nativeOfficialAudience, nativeOfficialAudienceAccountCount, connectedProviders, availableProviders, mainAudience, mainAccountState,
    recoveryDestinations: (() => {
      const remainingMetrics = [...recoveryDestinations];
      const projectedBackups = activeAccounts.filter((account) => account.role === "backup").map((account) => {
        const connectionId = accounts.find((row) => creatorAccountKey(creator.id, row.id) === account.accountKey)?.id;
        const audienceMetric = connectionId ? audienceMetrics.find((row) => row.connection_id === connectionId && row.account_category === "backup") : undefined;
        const metricIndex = remainingMetrics.findIndex((row) => row.provider === account.provider && row.display_name === account.displayName && row.role === "backup");
        const metric = metricIndex >= 0 ? remainingMetrics.splice(metricIndex, 1)[0] : null;
        const optedInFanCount = Number(metric?.opted_in_fan_count ?? 0);
        const protectedOfficialId=accounts.find(row=>creatorAccountKey(creator.id,row.id)===account.accountKey)?.protected_official_account_id;
        return { destinationId: account.accountKey, provider: account.provider, displayName: account.displayName, handle: account.handle, role: "backup" as const, verificationState: account.revoked ? "revoked" as const : account.needsAttention ? "needs_attention" as const : account.verified ? "verified" as const : "unverified" as const, recoveryPassOptIns: optedInFanCount, uniqueProtectedFans: optedInFanCount, coveragePercent: protectedFans ? optedInFanCount * 100 / protectedFans : null, nativeAudience: audienceMetric?.audience_count === null || audienceMetric?.audience_count === undefined ? null : Number(audienceMetric.audience_count), nativeAudienceUnit: audienceMetric?.audience_unit ?? "subscribers", nativeAudienceStatus: audienceMetric?.status as PlatformAudienceMetricStatus | undefined, synchronizedAt: audienceMetric?.source_observed_at ?? account.lastSynchronizedAt ?? (metric?.synchronized_at as string | null ?? null), href: account.provider === "youtube" && !account.verified && connectionId&&protectedOfficialId ? `/api/integrations/youtube/connect?role=backup&connectionId=${encodeURIComponent(connectionId)}&protectedOfficialAccountId=${encodeURIComponent(protectedOfficialId)}` : "/dashboard/platforms" };
      });
      return [...projectedBackups, ...remainingMetrics.filter((row) => row.role !== "backup").map((row) => ({ destinationId: row.destination_id, provider: row.provider as AudienceProvider, displayName: row.display_name, handle: row.display_handle as string | null, role: row.role as "backup" | "emergency_replacement" | "recovery_destination", verificationState: row.verification_state as "verified" | "needs_attention" | "unverified" | "revoked", recoveryPassOptIns: Number(row.opted_in_fan_count), uniqueProtectedFans: Number(row.opted_in_fan_count), coveragePercent: protectedFans ? Number(row.opted_in_fan_count) * 100 / protectedFans : null, nativeAudience: null as number | null, nativeAudienceUnit: null as string | null, nativeAudienceStatus: undefined as PlatformAudienceMetricStatus | undefined, synchronizedAt: row.synchronized_at as string | null, href: row.href }))];
    })(),
    recentOptIns: optIns.map((row) => ({ id: row.preference_id, displayLabel: "New protected fan", sourceLabel: Number(row.destination_count) === 1 && row.provider ? `Selected ${platformPresentation[row.provider]?.label ?? row.provider} backup` : `Selected ${Number(row.destination_count)} recovery destinations`, occurredAt: row.selected_at })),
    identity: { trustState: trust[0]?.trust_state ?? (identityProfile?.identity_status === "verified" ? "Verified" : "Not verified"), authenticityState: authenticity?.display_enabled ? "Issued" : "Not issued", monitoringState: monitoring.some((row) => !["resolved", "dismissed"].includes(row.status)) ? "Needs attention" : "Healthy", verifiedAccounts: identityAccounts.filter((account) => account.verification_status === "verified").length, revision: identityProfile?.identity_revision ?? null },
    ecosystem: { verifiedDestinations: destinations.filter((row) => row.verification_status === "verified").length, activeAutomations: destinations.filter((row) => row.automation_enabled && !row.automation_paused_at).length, openIncidents: openEcosystem, lastSyncAt, health: openEcosystem ? "Needs attention" : destinations.length ? "Healthy" : "Setup available" },
    emergency: { activeEmergencyId: activeEmergency?.id ?? null, activeEmergencyCount: activeEmergency ? 1 : 0, status: activeEmergency ? "Active incident" : "No active emergency", severity: activeEmergency?.severity ?? null, activatedAt: activeEmergency?.activated_at ?? null, recoveryPassActive: creator.recovery_pass_enabled, lastDrillAt: drill?.completed_at ?? null, planValidationState: plan?.readiness_status ?? "Not configured" }, liveRecovery, nextAction };
}

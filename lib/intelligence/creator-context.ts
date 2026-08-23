import "server-only";
import type { Creator } from "@/lib/database.helpers";
import type { CreatorDashboardData } from "@/lib/dashboard/creator-dashboard";
import { requireCreator } from "@/lib/dal";
import { getCreatorDashboard } from "@/lib/dashboard/creator-dashboard";

export type CreatorConnectionIssue = {
  provider: string;
  role: "official" | "recovery";
  state: "needs_attention" | "revoked" | "unverified";
  explanation: string;
};

export type AudienceOwnCreatorContext = {
  creator: { creatorId:string; displayName:string; handle:string; recoveryPassEnabled:boolean; recoveryPassPublished:boolean };
  platforms: { officialCount:number; recoveryCount:number; totalCount:number; needsAttentionCount:number; connectionIssues:CreatorConnectionIssue[] };
  audience: { protectedAudienceCount:number | null; recoveryConnectionCount:number | null; preferenceSummary:Array<{ category:string; count:number }> };
  communications: { recentCount:number | null; scheduledCount:number | null; failedCount:number | null; recentTypes:string[] };
  recovery: { readinessState:string; readinessPercent:number | null; destinationCount:number | null; unresolvedIssues:string[] };
  emergency: { active:boolean; severity:string | null; recent:boolean; planState:string };
  availability: { audience:boolean; destinations:boolean; communications:boolean };
  calculatedAt: string;
};

export type AiSafeCreatorContext = Omit<AudienceOwnCreatorContext, "creator"> & {
  creator: Omit<AudienceOwnCreatorContext["creator"], "creatorId">;
};

const boundedText = (value: string | null | undefined, fallback: string) => (value?.trim() || fallback).slice(0, 80);

export function buildCreatorIntelligenceContext(creator: Creator, data: CreatorDashboardData): AudienceOwnCreatorContext {
  const started = performance.now();
  const official = (data.dashboardAccounts ?? []).slice(0, 20);
  const recovery = (data.recoveryDestinations ?? []).slice(0, 20);
  const issues: CreatorConnectionIssue[] = [
    ...official.filter((account) => account.actionRequired).map((account) => ({
      provider:boundedText(account.provider, "Platform"), role:"official" as const, state:"needs_attention" as const,
      explanation:boundedText(account.capabilityNotice ?? account.connectionLabel, "This connection needs review."),
    })),
    ...recovery.filter((account) => account.verificationState !== "verified").map((account) => ({
      provider:boundedText(account.provider, "Platform"), role:"recovery" as const,
      state:account.verificationState === "revoked" ? "revoked" as const : account.verificationState === "needs_attention" ? "needs_attention" as const : "unverified" as const,
      explanation:account.verificationState === "revoked" ? "Authorization was revoked." : account.verificationState === "needs_attention" ? "This recovery connection needs review." : "This recovery connection is not verified.",
    })),
  ].slice(0, 10);
  const audienceAvailable = data.availability?.recoveryAudience?.status !== "unavailable";
  const destinationsAvailable = data.availability?.recoveryDestinations?.status !== "unavailable";
  const communicationsAvailable = data.availability?.audienceUpdates?.status !== "unavailable";
  const updates = data.audienceUpdates;
  const unresolvedIssues = data.recoveryReadiness.checklist.filter((item) => item.status === "incomplete").map((item) => item.label).slice(0, 5);
  const recentTypes = [...new Set((updates?.recent ?? []).slice(0, 5).map((update) => update.broadcastIntent))];
  const context: AudienceOwnCreatorContext = {
    creator:{ creatorId:creator.id, displayName:boundedText(data.creator.displayName, "Creator"), handle:boundedText(data.creator.handle, "creator"), recoveryPassEnabled:Boolean(creator.recovery_pass_enabled), recoveryPassPublished:Boolean(creator.public_profile_enabled) },
    platforms:{ officialCount:official.length, recoveryCount:recovery.length, totalCount:official.length + recovery.length, needsAttentionCount:issues.length, connectionIssues:issues },
    audience:{ protectedAudienceCount:audienceAvailable ? data.recoveryAudience.protectedAudience : null, recoveryConnectionCount:audienceAvailable ? data.recoveryAudience.recoveryConnections : null, preferenceSummary:[] },
    communications:{ recentCount:communicationsAvailable ? updates?.recent.slice(0, 5).length ?? 0 : null, scheduledCount:communicationsAvailable ? updates?.scheduled ?? 0 : null, failedCount:communicationsAvailable ? updates?.recent.slice(0, 5).filter((update) => update.status === "failed").length ?? 0 : null, recentTypes },
    recovery:{ readinessState:data.recoveryReadiness.state, readinessPercent:data.recoveryReadiness.score, destinationCount:destinationsAvailable ? recovery.length : null, unresolvedIssues },
    emergency:{ active:Boolean(data.emergency?.activeEmergencyCount), severity:typeof data.emergency?.severity === "string" ? data.emergency.severity : null, recent:Boolean(data.emergency?.activeEmergencyId || data.emergency?.activatedAt), planState:typeof data.emergency?.planValidationState === "string" ? data.emergency.planValidationState : "Not configured" },
    availability:{ audience:audienceAvailable, destinations:destinationsAvailable, communications:communicationsAvailable },
    calculatedAt:data.calculatedAt,
  };
  console.info(JSON.stringify({ event:"intelligence_context_built", creatorId:creator.id, officialCount:context.platforms.officialCount, recoveryCount:context.platforms.recoveryCount, issueCount:issues.length, contextBuildMs:Math.round(performance.now() - started) }));
  return context;
}

export async function getAuthenticatedCreatorIntelligenceContext() {
  const creator = await requireCreator();
  return buildCreatorIntelligenceContext(creator, await getCreatorDashboard(creator));
}

export function toAiSafeCreatorContext(context: AudienceOwnCreatorContext): AiSafeCreatorContext {
  return {
    creator:{ displayName:context.creator.displayName, handle:context.creator.handle, recoveryPassEnabled:context.creator.recoveryPassEnabled, recoveryPassPublished:context.creator.recoveryPassPublished },
    platforms:{ officialCount:context.platforms.officialCount, recoveryCount:context.platforms.recoveryCount, totalCount:context.platforms.totalCount, needsAttentionCount:context.platforms.needsAttentionCount, connectionIssues:context.platforms.connectionIssues.map((issue) => ({ provider:issue.provider, role:issue.role, state:issue.state, explanation:issue.explanation })) },
    audience:{ protectedAudienceCount:context.audience.protectedAudienceCount, recoveryConnectionCount:context.audience.recoveryConnectionCount, preferenceSummary:context.audience.preferenceSummary.map((item) => ({ category:item.category, count:item.count })) },
    communications:{ recentCount:context.communications.recentCount, scheduledCount:context.communications.scheduledCount, failedCount:context.communications.failedCount, recentTypes:[...context.communications.recentTypes] },
    recovery:{ readinessState:context.recovery.readinessState, readinessPercent:context.recovery.readinessPercent, destinationCount:context.recovery.destinationCount, unresolvedIssues:[...context.recovery.unresolvedIssues] },
    emergency:{ active:context.emergency.active, severity:context.emergency.severity, recent:context.emergency.recent, planState:context.emergency.planState },
    availability:{ audience:context.availability.audience, destinations:context.availability.destinations, communications:context.availability.communications }, calculatedAt:context.calculatedAt,
  };
}

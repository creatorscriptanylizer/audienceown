import "server-only";
import { CREATE_EMERGENCY_ENTRY_ROUTE, CREATE_UPDATE_ENTRY_ROUTE, DASHBOARD_PLATFORMS_ROUTE } from "@/lib/dashboard-routes";
import type { AudienceOwnCreatorContext, AiSafeCreatorContext } from "./creator-context";
import { deriveCreatorSignals, type CreatorSignal, type CreatorSignalId, type CreatorSignalPriority } from "./creator-signals";

export const creatorIntelligenceActions = {
  ADD_FIRST_ACCOUNT:{ href:DASHBOARD_PLATFORMS_ROUTE, label:"Add your first account" },
  ADD_RECOVERY_ACCOUNT:{ href:DASHBOARD_PLATFORMS_ROUTE, label:"Add recovery account" },
  REVIEW_ACCOUNT:{ href:DASHBOARD_PLATFORMS_ROUTE, label:"Review connection" },
  GO_TO_PLATFORMS:{ href:DASHBOARD_PLATFORMS_ROUTE, label:"Manage platforms" },
  CREATE_UPDATE:{ href:CREATE_UPDATE_ENTRY_ROUTE, label:"Create update" },
  CREATE_EMERGENCY_ALERT:{ href:CREATE_EMERGENCY_ENTRY_ROUTE, label:"Create emergency alert" },
  VIEW_RECOVERY_PASS:{ href:"/dashboard/creator-page", label:"View Recovery Pass" },
  VIEW_ANALYTICS:{ href:"/dashboard/analytics/recovery", label:"View analytics" },
} as const;
export type CreatorActionId = keyof typeof creatorIntelligenceActions;

export type CreatorRecommendation = {
  id:string; type:string; priority:CreatorSignalPriority; category:"platforms"|"recovery"|"communications"|"audience";
  title:string; description:string; reason:string; actionId:CreatorActionId; sourceSignals:CreatorSignalId[]; generatedBy:"deterministic"|"ai_enhanced";
};
export type CreatorIntelligenceBrief = { topRecommendation:CreatorRecommendation | null; additionalRecommendations:CreatorRecommendation[]; signals:CreatorSignal[]; generatedAt:string };

function fromSignal(signal: CreatorSignal): CreatorRecommendation | null {
  const provider = typeof signal.metadata?.provider === "string" ? signal.metadata.provider : "Platform";
  const explanation = typeof signal.metadata?.explanation === "string" ? signal.metadata.explanation : "This connection needs review.";
  switch (signal.id) {
    case "ACCOUNT_NEEDS_ATTENTION": return { id:`account-${provider.toLowerCase()}-attention`, type:"connection_review", priority:signal.priority, category:"platforms", title:`${provider} needs your attention`, description:`${explanation} Restore this connection to keep your recovery setup healthy.`, reason:"A current canonical connection state requires review.", actionId:"REVIEW_ACCOUNT", sourceSignals:[signal.id], generatedBy:"deterministic" };
    case "NO_OFFICIAL_ACCOUNTS": return { id:"connect-first-platform", type:"platform_setup", priority:signal.priority, category:"platforms", title:"Connect your first platform", description:"Your recovery network starts with the accounts your audience already knows. Add your first platform to get started.", reason:"No Main account is currently connected.", actionId:"ADD_FIRST_ACCOUNT", sourceSignals:[signal.id], generatedBy:"deterministic" };
    case "NO_RECOVERY_ACCOUNTS": return { id:"add-recovery-account", type:"recovery_setup", priority:signal.priority, category:"recovery", title:"Strengthen your recovery setup", description:"You have a Main account connected. Add a recovery destination so your audience has another trusted place to find you.", reason:"A Main account exists without a Recovery Account.", actionId:"ADD_RECOVERY_ACCOUNT", sourceSignals:[signal.id], generatedBy:"deterministic" };
    case "FAILED_UPDATE": return { id:"review-failed-update", type:"communication_review", priority:signal.priority, category:"communications", title:"Review a failed update", description:"A recent audience update did not complete successfully. Review its delivery state before sending another update.", reason:"A bounded recent update summary contains a failed status.", actionId:"CREATE_UPDATE", sourceSignals:[signal.id], generatedBy:"deterministic" };
    case "NO_PROTECTED_AUDIENCE": return { id:"share-recovery-pass", type:"audience_growth", priority:signal.priority, category:"audience", title:"Start protecting your audience", description:"Share your Recovery Pass so followers can choose how to find you if an account becomes unavailable.", reason:"The verified protected audience count is zero.", actionId:"VIEW_RECOVERY_PASS", sourceSignals:[signal.id], generatedBy:"deterministic" };
    default:return null;
  }
}

export function getCreatorIntelligenceBrief(context: AudienceOwnCreatorContext): CreatorIntelligenceBrief {
  const signals = deriveCreatorSignals(context);
  const recommendations = signals.map(fromSignal).filter((item): item is CreatorRecommendation => Boolean(item)).slice(0, 4);
  const brief = { topRecommendation:recommendations[0] ?? null, additionalRecommendations:recommendations.slice(1, 4), signals, generatedAt:new Date().toISOString() };
  console.info(JSON.stringify({ event:"recommendation_selected", recommendationId:brief.topRecommendation?.id ?? null, generatedBy:"deterministic" }));
  return brief;
}

type Enhancement = { title:string; description:string; actionId:string };
export async function enhanceCreatorRecommendation(recommendation: CreatorRecommendation, context: AiSafeCreatorContext, request: () => Promise<unknown>): Promise<CreatorRecommendation> {
  try {
    const raw = await request();
    if (!raw || typeof raw !== "object") throw new Error("malformed_output");
    const value = raw as Partial<Enhancement>;
    if (typeof value.title !== "string" || !value.title.trim() || value.title.length > 80 || typeof value.description !== "string" || !value.description.trim() || value.description.length > 220) throw new Error("malformed_output");
    if (!(value.actionId && value.actionId in creatorIntelligenceActions) || value.actionId !== recommendation.actionId) throw new Error("unknown_action");
    const combined = `${value.title} ${value.description}`.toLowerCase();
    const providerNames = ["youtube","instagram","tiktok","facebook","discord","twitch","linkedin","spotify","pinterest","snapchat"];
    const supported = new Set(context.platforms.connectionIssues.map((issue) => issue.provider.toLowerCase()));
    if (providerNames.some((provider) => combined.includes(provider) && !supported.has(provider))) throw new Error("unsupported_provider_claim");
    return { ...recommendation, title:value.title.trim(), description:value.description.trim(), generatedBy:"ai_enhanced" };
  } catch {
    console.warn(JSON.stringify({ event:"fallback_used", recommendationId:recommendation.id }));
    return recommendation;
  }
}

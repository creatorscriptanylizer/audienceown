import type { AudienceOwnCreatorContext } from "./creator-context";

export type CreatorSignalId = "ACCOUNT_NEEDS_ATTENTION" | "RECENT_EMERGENCY" | "RECOVERY_SETUP_INCOMPLETE" | "NO_OFFICIAL_ACCOUNTS" | "NO_RECOVERY_ACCOUNTS" | "FAILED_UPDATE" | "SCHEDULED_UPDATE_PENDING" | "NO_PROTECTED_AUDIENCE" | "RECOVERY_PASS_READY" | "HEALTHY_SETUP";
export type CreatorSignalPriority = "critical" | "high" | "medium" | "low" | "positive";
export type CreatorSignal = { id:CreatorSignalId; priority:CreatorSignalPriority; category:"platforms"|"recovery"|"communications"|"audience"; metadata?:Record<string,string|number|boolean> };

const rank: Record<CreatorSignalPriority, number> = { critical:0, high:1, medium:2, low:3, positive:4 };

export function deriveCreatorSignals(context: AudienceOwnCreatorContext): CreatorSignal[] {
  const started = performance.now();
  const signals: CreatorSignal[] = [];
  const issue = context.platforms.connectionIssues[0];
  if (issue) signals.push({ id:"ACCOUNT_NEEDS_ATTENTION", priority:issue.state === "revoked" ? "critical" : "high", category:"platforms", metadata:{ provider:issue.provider, role:issue.role, state:issue.state, explanation:issue.explanation } });
  if (context.emergency.active) signals.push({ id:"RECENT_EMERGENCY", priority:"critical", category:"recovery", metadata:{ severity:context.emergency.severity ?? "unknown" } });
  if (context.platforms.officialCount === 0) signals.push({ id:"NO_OFFICIAL_ACCOUNTS", priority:"high", category:"platforms" });
  else if (context.platforms.recoveryCount === 0 && context.availability.destinations) signals.push({ id:"NO_RECOVERY_ACCOUNTS", priority:"high", category:"recovery" });
  if (context.recovery.readinessPercent !== null && context.recovery.readinessPercent < 100) signals.push({ id:"RECOVERY_SETUP_INCOMPLETE", priority:"medium", category:"recovery", metadata:{ readiness:context.recovery.readinessPercent } });
  if ((context.communications.failedCount ?? 0) > 0) signals.push({ id:"FAILED_UPDATE", priority:"high", category:"communications", metadata:{ count:context.communications.failedCount! } });
  if ((context.communications.scheduledCount ?? 0) > 0) signals.push({ id:"SCHEDULED_UPDATE_PENDING", priority:"low", category:"communications", metadata:{ count:context.communications.scheduledCount! } });
  if (context.audience.protectedAudienceCount === 0) signals.push({ id:"NO_PROTECTED_AUDIENCE", priority:"low", category:"audience" });
  if (context.recovery.readinessPercent === 100) signals.push({ id:"RECOVERY_PASS_READY", priority:"positive", category:"recovery" });
  if (!issue && context.platforms.officialCount > 0 && context.platforms.recoveryCount > 0 && context.recovery.readinessPercent === 100) signals.push({ id:"HEALTHY_SETUP", priority:"positive", category:"recovery" });
  const sorted = signals.sort((a, b) => rank[a.priority] - rank[b.priority]);
  console.info(JSON.stringify({ event:"signals_derived", signalCount:sorted.length, topSignal:sorted[0]?.id ?? null, signalDerivationMs:Math.round(performance.now() - started) }));
  return sorted;
}

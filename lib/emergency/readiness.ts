import type { EmergencySeverity } from "./types";

export type EmergencyPlanReadiness = {
  ready: boolean;
  status: "incomplete" | "ready" | "needs_attention";
  blockers: string[];
  warnings: string[];
  checkedAt: string;
};

export type PlanReadinessInput = {
  affectedAccountExists: boolean;
  templateValid: boolean;
  recoveryPassEnabled: boolean;
  publicPageEnabled: boolean;
  hasManager: boolean;
  hasActivator: boolean;
  hasSeparateApprover: boolean;
  severity: EmergencySeverity;
  proposedReplacementUrl?: string | null;
  replacementVerified?: boolean;
  checkedAt?: string;
};

export function calculatePlanReadiness(input: PlanReadinessInput): EmergencyPlanReadiness {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!input.affectedAccountExists) blockers.push("The affected official account is unavailable.");
  if (!input.templateValid) blockers.push("The prepared title or message is invalid.");
  if (!input.recoveryPassEnabled) blockers.push("Recovery Pass is disabled.");
  if (!input.publicPageEnabled) blockers.push("The public creator page is disabled.");
  if (!input.hasManager) blockers.push("No emergency manager is configured.");
  if (!input.hasActivator) blockers.push("No emergency activator is configured.");
  if (input.severity === "critical" && !input.hasSeparateApprover) blockers.push("A separate critical-incident approver is required.");
  if (input.proposedReplacementUrl) {
    try {
      const url = new URL(input.proposedReplacementUrl);
      if (url.protocol !== "https:") blockers.push("The proposed replacement URL must use HTTPS.");
    } catch { blockers.push("The proposed replacement URL is invalid."); }
    if (!input.replacementVerified) warnings.push("The proposed replacement is saved for planning only and is not verified.");
  }
  const ready = blockers.length === 0;
  return { ready, status: ready ? "ready" : input.affectedAccountExists && input.templateValid ? "needs_attention" : "incomplete", blockers, warnings, checkedAt: input.checkedAt ?? new Date().toISOString() };
}

import type { EmergencyPlanReadiness } from "./readiness";

export type EmergencyDrillResult = {
  status: "passed" | "failed";
  recipientSummary: { eligibleRecoveryPassHolders: number; excludedRecipientCounts: Record<string, number> };
  transportSummary: Record<string, number>;
  approvalChecks: { separateApproverAvailable: boolean; activationPermissionAvailable: boolean };
  reauthenticationCheck: { required: boolean; recent: boolean };
  replacementCheck: { proposed: boolean; verified: false };
  publicBannerPreview: { title: string; message: string; severity: string } | null;
  blockers: string[];
  warnings: string[];
  completedAt: string;
};

export function buildDrillResult(input: {
  readiness: EmergencyPlanReadiness;
  eligible: number;
  excluded: Record<string, number>;
  transports: Record<string, number>;
  separateApproverAvailable: boolean;
  activationPermissionAvailable: boolean;
  reauthenticationRequired: boolean;
  recentlyReauthenticated: boolean;
  proposedReplacement: boolean;
  preview: { title: string; message: string; severity: string };
  missingProviders?: string[];
  completedAt?: string;
}): EmergencyDrillResult {
  const blockers = [...input.readiness.blockers];
  const warnings = [...input.readiness.warnings];
  if (!input.activationPermissionAvailable) blockers.push("No emergency activator is configured.");
  if (input.reauthenticationRequired && !input.recentlyReauthenticated) blockers.push("Recent reauthentication would be required for real activation.");
  if (input.eligible === 0) warnings.push("No eligible Recovery Pass holders were found.");
  if (input.missingProviders?.length) blockers.push(`Delivery providers are unavailable: ${input.missingProviders.join(", ")}.`);
  return {
    status: blockers.length ? "failed" : "passed",
    recipientSummary: { eligibleRecoveryPassHolders: input.eligible, excludedRecipientCounts: input.excluded },
    transportSummary: input.transports,
    approvalChecks: { separateApproverAvailable: input.separateApproverAvailable, activationPermissionAvailable: input.activationPermissionAvailable },
    reauthenticationCheck: { required: input.reauthenticationRequired, recent: input.recentlyReauthenticated },
    replacementCheck: { proposed: input.proposedReplacement, verified: false },
    publicBannerPreview: input.preview,
    blockers, warnings, completedAt: input.completedAt ?? new Date().toISOString(),
  };
}

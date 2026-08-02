export type ProtectionScoreInput = {
  recoveryCoveragePercent: number; recoveryPagePublished: boolean; recoveryPassEnabled: boolean;
  verifiedOfficialAccount: boolean; verifiedBackupAccount: boolean;
};

export function calculateProtectionScore(input: ProtectionScoreInput) {
  const components = [
    { key: "recovery_coverage", label: "Eligible fans with a usable Recovery Pass", points: Math.round(Math.max(0, Math.min(100, input.recoveryCoveragePercent)) * 0.6), maximum: 60 },
    { key: "recovery_page", label: "Recovery page published", points: input.recoveryPagePublished ? 10 : 0, maximum: 10 },
    { key: "recovery_pass", label: "Recovery Pass enabled", points: input.recoveryPassEnabled ? 10 : 0, maximum: 10 },
    { key: "official_account", label: "Verified official account available", points: input.verifiedOfficialAccount ? 10 : 0, maximum: 10 },
    { key: "backup_account", label: "Verified backup account available", points: input.verifiedBackupAccount ? 10 : 0, maximum: 10 },
  ];
  const score = components.reduce((sum, component) => sum + component.points, 0);
  const state = score >= 80 ? "Strong protection" : score >= 60 ? "Good foundation" : score >= 30 ? "Needs improvement" : "High exposure";
  return { score, state, version: "audience-protection-v1", explanation: "60% recovery coverage and four 10-point verified readiness controls.", components };
}

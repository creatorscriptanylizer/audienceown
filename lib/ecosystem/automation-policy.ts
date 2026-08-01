export const ECOSYSTEM_AUTOMATION_POLICY_VERSION = "ecosystem-automation-v1" as const;
export const automationClassifications = ["harmless_metadata_change","safe_canonical_change","transient_provider_failure","repeated_provider_failure","missing_scope","missing_permission","authoritative_revocation","stable_identity_conflict","destination_transfer","destination_private","destination_deleted","manifest_drift","feed_migration","verification_expired","verification_recovered","unsupported_change"] as const;
export type AutomationClassification = typeof automationClassifications[number];
export type AutomationPolicyInput = {
  observationType: string; authoritative: boolean; stableIdMatches: boolean; sameVerifiedHost?: boolean; consecutiveFailures?: number;
  official?: boolean; primary?: boolean; publicVisible?: boolean; automationEnabled?: boolean; autoApplySafeChanges?: boolean;
  activeEmergency?: boolean; relationshipActive?: boolean; providerSupportsRetry?: boolean;
};
export type AutomationPolicyDecision = {
  classification: AutomationClassification; severity: "info"|"low"|"medium"|"high"|"critical"; safeAutoApply: boolean;
  suppressPublicPresentation: boolean; revokeVerification: boolean; markNeedsAttention: boolean; relationshipChanges: "none"|"update"|"revoke";
  trustReevaluationRequired: boolean; authenticityRefreshRequired: boolean; creatorAlertRequired: boolean; incidentRequired: boolean;
  retryRequired: boolean; retryDelay: number | null; blockers: string[]; warnings: string[]; policyVersion: typeof ECOSYSTEM_AUTOMATION_POLICY_VERSION;
};
export function applyEcosystemAutomationPolicy(input: AutomationPolicyInput): AutomationPolicyDecision {
  let classification: AutomationClassification = "unsupported_change";
  const t = input.observationType;
  if (!input.stableIdMatches || t === "stable_id_mismatch") classification = "stable_identity_conflict";
  else if (["display_name_changed","handle_changed","relationship_changed"].includes(t)) classification = "harmless_metadata_change";
  else if (t === "canonical_url_changed") classification = input.sameVerifiedHost ? "safe_canonical_change" : "unsupported_change";
  else if (["sync_failed","destination_unavailable"].includes(t)) classification = (input.consecutiveFailures ?? 0) >= 3 ? "repeated_provider_failure" : "transient_provider_failure";
  else if (t === "scope_missing") classification = "missing_scope";
  else if (t === "permission_missing") classification = "missing_permission";
  else if (["grant_revoked","destination_archived"].includes(t)) classification = "authoritative_revocation";
  else if (t === "destination_transferred") classification = "destination_transfer";
  else if (t === "visibility_changed") classification = "destination_private";
  else if (t === "destination_deleted") classification = "destination_deleted";
  else if (["domain_manifest_changed","application_manifest_changed"].includes(t)) classification = "manifest_drift";
  else if (["feed_changed","feed_moved"].includes(t)) classification = "feed_migration";
  else if (t === "verification_expired") classification = "verification_expired";
  else if (["verification_restored","destination_restored","sync_recovered"].includes(t)) classification = "verification_recovered";
  const safe = ["harmless_metadata_change","safe_canonical_change"].includes(classification) && input.stableIdMatches && input.automationEnabled !== false && input.autoApplySafeChanges !== false;
  const transient = ["transient_provider_failure","repeated_provider_failure"].includes(classification);
  const unsafe = ["authoritative_revocation","stable_identity_conflict","destination_transfer","destination_private","destination_deleted","verification_expired"].includes(classification);
  const suppress = input.authoritative && unsafe;
  const needsAttention = suppress || ["missing_scope","missing_permission","manifest_drift","feed_migration","repeated_provider_failure"].includes(classification);
  const retryDelay = transient ? Math.min(86400, 60 * 2 ** Math.min(10, input.consecutiveFailures ?? 0)) : null;
  return { classification, severity: suppress ? (classification === "stable_identity_conflict" ? "critical" : "high") : needsAttention ? "medium" : transient ? "low" : "info",
    safeAutoApply: safe, suppressPublicPresentation: suppress, revokeVerification: input.authoritative && ["authoritative_revocation","destination_deleted"].includes(classification),
    markNeedsAttention: needsAttention, relationshipChanges: input.authoritative && ["destination_transfer","authoritative_revocation","destination_deleted"].includes(classification) ? "revoke" : t === "relationship_changed" && safe ? "update" : "none",
    trustReevaluationRequired: suppress || safe || classification === "verification_recovered", authenticityRefreshRequired: suppress || safe || classification === "verification_recovered",
    creatorAlertRequired: needsAttention || suppress || classification === "verification_recovered", incidentRequired: needsAttention || suppress,
    retryRequired: transient && input.providerSupportsRetry !== false, retryDelay, blockers: [...(!input.stableIdMatches ? ["stable_external_id_mismatch"] : []), ...(input.activeEmergency ? ["emergency_presentation_has_priority"] : [])],
    warnings: !input.authoritative && unsafe ? ["non_authoritative_signal_cannot_suppress"] : [], policyVersion: ECOSYSTEM_AUTOMATION_POLICY_VERSION };
}

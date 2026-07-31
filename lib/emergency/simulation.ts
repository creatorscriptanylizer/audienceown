import { aggregateExclusionReasons, aggregateRecipientsByTransport, deduplicateRecipients, evaluateRecipientEligibility, type RecipientCandidate } from "@/lib/update-recipients";
import type { BroadcastIntent } from "@/lib/broadcast-studio";

export type SimulationCandidate = RecipientCandidate;

export function simulateRecipientAggregation(candidates: SimulationCandidate[]) {
  const evaluations = candidates.map((candidate) => evaluateRecipientEligibility(candidate, "account_update"));
  const eligible = evaluations.flatMap((item) => item.eligible ? [item.recipient] : []);
  const deduplicated = deduplicateRecipients(eligible);
  return {
    eligibleRecoveryPassHolders: deduplicated.recipients.length,
    transportSummary: aggregateRecipientsByTransport(deduplicated.recipients),
    excludedRecipientCounts: aggregateExclusionReasons(evaluations),
    duplicateCount: deduplicated.duplicates,
  };
}

export function emergencyIntent(type: string): BroadcastIntent {
  if (type === "account_hacked") return "account_hacked";
  if (type === "account_banned") return "account_banned";
  if (type === "fake_account_warning") return "impersonation_warning";
  if (type === "account_changed") return "platform_migration";
  return "account_inaccessible";
}

/**
 * AudienceOwn's current creator-verification claim:
 * A creator is Verified by AudienceOwn when AudienceOwn has verified that the
 * creator controls at least one Main account included in their AudienceOwn identity.
 * This is account-control verification, not legal-person identity verification.
 */
export const CREATOR_VERIFICATION_BASIS = "verified_main_account_control" as const;

export type CreatorVerificationStatus = "verified" | "pending";
export type CreatorVerificationResult = {
  status: CreatorVerificationStatus;
  verified: boolean;
  verifiedMainAccountCount: number;
  totalMainAccountCount: number;
  basis: typeof CREATOR_VERIFICATION_BASIS;
  verifiedMainAccountIds: string[];
};

type MainConnection = { id: string; account_type: string };
type AccountVerification = { source_connection_id: string | null; verification_status: string };

export function resolveCreatorVerification(
  connections: readonly MainConnection[],
  accountVerifications: readonly AccountVerification[],
): CreatorVerificationResult {
  const mains = connections.filter(account => account.account_type === "official");
  const currentVerifiedConnectionIds = new Set(accountVerifications.filter(account => account.source_connection_id && account.verification_status === "verified").map(account => account.source_connection_id!));
  const verifiedMainAccountIds = mains.filter(main => currentVerifiedConnectionIds.has(main.id)).map(main => main.id);
  const verified = verifiedMainAccountIds.length > 0;
  return { status: verified ? "verified" : "pending", verified, verifiedMainAccountCount: verifiedMainAccountIds.length, totalMainAccountCount: mains.length, basis: CREATOR_VERIFICATION_BASIS, verifiedMainAccountIds };
}

export function creatorVerificationSummary(name: string, result: CreatorVerificationResult) {
  if (!result.totalMainAccountCount) return "No Main accounts are available for verification yet.";
  if (!result.verified) return "AudienceOwn has not yet verified control of any Main accounts.";
  return `AudienceOwn has verified ${name}'s control of ${result.verifiedMainAccountCount} Main account${result.verifiedMainAccountCount === 1 ? "" : "s"}.`;
}

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { canonicalAccountConnected, resolveConnectionStatus } from "@/lib/social-providers/connection-health";
import { CommunicationAudienceError, resolveCommunicationAudiencePreview } from "@/lib/communication-audience";

export type PublishingAccountSummary = {
  id: string;
  provider: string;
  displayName: string;
  handle: string | null;
  role: "main" | "recovery";
  targetingRule: "recovery_pass_video_opt_in";
  eligible: number;
};

export type NewVideoAudienceResolution = {
  accounts: PublishingAccountSummary[];
  eligibleConnectionIds: Set<string>;
  eligibleContactIds: Set<string>;
  perAccountConnectionIds: Map<string, Set<string>>;
  uniqueEligible: number;
  explanation: string;
};

export class NewVideoTargetingError extends Error {
  constructor(public readonly code: "invalid_accounts" | "audience_unavailable") {
    super(code);
  }
}

export async function resolveConnectedAccountContext(creatorId: string, accountIds: string[]) {
  const db = createAdminClient();
  if (!db) throw new NewVideoTargetingError("audience_unavailable");
  const uniqueIds = [...new Set(accountIds)];
  const { data: accounts, error } = uniqueIds.length
    ? await db.from("connected_accounts")
      .select("id,platform,account_type,label,external_account_name,url,external_account_id,connection_health,provider_status")
      .eq("creator_id", creatorId).in("id", uniqueIds)
    : { data: [], error: null };
  if (error) throw new NewVideoTargetingError("audience_unavailable");
  if ((accounts ?? []).length !== uniqueIds.length) throw new NewVideoTargetingError("invalid_accounts");
  if ((accounts ?? []).some((account) => {
    const connected = canonicalAccountConnected({ health: account.connection_health, providerStatus: account.provider_status, hasPublicUrl: Boolean(account.url), hasExternalAccountId: Boolean(account.external_account_id) });
    return !connected || resolveConnectionStatus({ health: account.connection_health, providerStatus: account.provider_status, canonicalConnected: connected }).actionRequired;
  })) throw new NewVideoTargetingError("invalid_accounts");
  if ((accounts ?? []).some((account) => account.account_type !== "official" && account.account_type !== "backup")) throw new NewVideoTargetingError("invalid_accounts");
  return (accounts ?? []).map((account) => ({
    id: account.id,
    provider: account.platform,
    displayName: account.external_account_name ?? account.label,
    handle: null,
    role: account.account_type === "official" ? "main" as const : "recovery" as const,
  }));
}

export async function resolveNewVideoAudience(creatorId: string, accountIds: string[]): Promise<NewVideoAudienceResolution> {
  const uniqueIds = [...new Set(accountIds)];
  const contextAccounts = await resolveConnectedAccountContext(creatorId, uniqueIds);
  let resolution;
  try { resolution = await resolveCommunicationAudiencePreview(creatorId, "new_video", uniqueIds); }
  catch (error) { throw new NewVideoTargetingError(error instanceof CommunicationAudienceError && error.code === "invalid_accounts" ? "invalid_accounts" : "audience_unavailable"); }
  const perAccountConnectionIds=new Map(uniqueIds.map(id=>[id,new Set(resolution.eligibleConnectionIds)]));
  const countByAccount=new Map(resolution.accounts.map(account=>[account.accountId,account.optedInFollowerCount]));
  const summaries = contextAccounts.map((account) => {
    return {
      ...account,
      targetingRule: "recovery_pass_video_opt_in" as const,
      eligible: countByAccount.get(account.id) ?? 0,
    };
  });
  return {
    accounts: summaries, eligibleConnectionIds:resolution.eligibleConnectionIds, eligibleContactIds:resolution.eligibleContactIds, perAccountConnectionIds,
    uniqueEligible: resolution.uniqueEligible,
    explanation: "Unique Recovery Pass followers who opted into Video alerts through the selected accounts and have verified email.",
  };
}

export async function replaceUpdateContextAccounts(updateId: string, creatorId: string, accountIds: string[]) {
  const accounts = await resolveConnectedAccountContext(creatorId, accountIds);
  const db = createAdminClient();
  if (!db) throw new NewVideoTargetingError("audience_unavailable");
  const { error: deleteError } = await db.from("creator_update_publishing_accounts").delete().eq("update_id", updateId);
  if (deleteError) throw new NewVideoTargetingError("audience_unavailable");
  if (!accounts.length) return accounts;
  const { error } = await db.from("creator_update_publishing_accounts").insert(accounts.map((account) => ({
    update_id: updateId,
    connected_account_id: account.id,
    connected_account_reference: account.id,
    role_snapshot: account.role,
    targeting_rule_snapshot: "recovery_pass_video_opt_in" as const,
    provider_snapshot: account.provider,
    account_display_snapshot: account.displayName,
    account_handle_snapshot: account.handle,
  })));
  if (error) throw new NewVideoTargetingError("audience_unavailable");
  return accounts;
}

export async function replaceUpdatePublishingAccounts(updateId: string, creatorId: string, accountIds: string[]) {
  const resolution = await resolveNewVideoAudience(creatorId, accountIds);
  const db = createAdminClient();
  if (!db) throw new NewVideoTargetingError("audience_unavailable");
  const { error: deleteError } = await db.from("creator_update_publishing_accounts").delete().eq("update_id", updateId);
  if (deleteError) throw new NewVideoTargetingError("audience_unavailable");
  if (!resolution.accounts.length) return resolution;
  const { error } = await db.from("creator_update_publishing_accounts").insert(resolution.accounts.map((account) => ({
    update_id: updateId,
    connected_account_id: account.id,
    connected_account_reference: account.id,
    role_snapshot: account.role,
    targeting_rule_snapshot: account.targetingRule,
    provider_snapshot: account.provider,
    account_display_snapshot: account.displayName,
    account_handle_snapshot: account.handle,
  })));
  if (error) throw new NewVideoTargetingError("audience_unavailable");
  return resolution;
}

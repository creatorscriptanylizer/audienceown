import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { canonicalAccountConnected, resolveConnectionStatus } from "@/lib/social-providers/connection-health";
import type { RecoveryCommunicationDestination } from "@/lib/recovery-communication";

export class RecoveryDestinationError extends Error {
  constructor(public readonly code: "invalid_destinations" | "unavailable") { super(code); }
}

export async function resolveRecoveryCommunicationDestinations(
  creatorId: string,
  mainAccountId: string,
  destinationIds: string[],
): Promise<RecoveryCommunicationDestination[]> {
  const db = createAdminClient();
  if (!db) throw new RecoveryDestinationError("unavailable");
  const uniqueIds = [...new Set(destinationIds)];
  if (!uniqueIds.length || uniqueIds.length !== destinationIds.length) throw new RecoveryDestinationError("invalid_destinations");
  const [accountsResult, networkResult] = await Promise.all([
    db.from("connected_accounts").select("id,platform,label,external_account_name,url,external_account_id,account_type,connection_health,provider_status")
      .eq("creator_id", creatorId).in("id", uniqueIds),
    db.from("recovery_networks").select("recovery_network_destinations(recovery_connected_account_id)")
      .eq("creator_id", creatorId).eq("main_connected_account_id", mainAccountId).maybeSingle(),
  ]);
  if (accountsResult.error || networkResult.error) throw new RecoveryDestinationError("unavailable");
  const accounts = accountsResult.data ?? [];
  const linked = new Set((networkResult.data?.recovery_network_destinations ?? []).map((row) => row.recovery_connected_account_id));
  if (accounts.length !== uniqueIds.length || uniqueIds.some((id) => !linked.has(id))) throw new RecoveryDestinationError("invalid_destinations");
  if (accounts.some((account) => {
    const connected = canonicalAccountConnected({health:account.connection_health,providerStatus:account.provider_status,hasPublicUrl:Boolean(account.url),hasExternalAccountId:Boolean(account.external_account_id)});
    return account.account_type !== "backup" || !account.url || !connected || resolveConnectionStatus({health:account.connection_health,providerStatus:account.provider_status,canonicalConnected:connected}).actionRequired;
  })) throw new RecoveryDestinationError("invalid_destinations");
  const byId = new Map(accounts.map((account) => [account.id, account]));
  return uniqueIds.map((id) => {
    const account = byId.get(id)!;
    return {id:account.id,provider:account.platform,displayName:account.external_account_name ?? account.label,url:account.url!};
  });
}

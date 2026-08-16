import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createCreatorAccountProjection, creatorConnectionProjectionState, resolveCreatorBackups, resolveCreatorMain } from "./creator-account-projection";

export const creatorProviderAccountSelect = "id,platform,account_type,label,url,is_primary,is_public,position,external_account_id,external_account_name,connection_health,provider_status,last_sync_at,last_connection_error,granted_scopes,watch_enabled,lease_expires_at,capability_state,created_at,protected_official_account_id";

export type CreatorProviderAccountRows = Awaited<ReturnType<typeof getCreatorProviderAccounts>>;

function safeErrorText(value: unknown) {
  return typeof value === "string"
    ? value.slice(0, 240).replaceAll(/https?:\/\/\S+/g, "[url]").replaceAll(/[\w.+-]+@[\w.-]+/g, "[email]").replaceAll(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "[id]")
    : null;
}

function logProviderQueryError(query: string, table: string, error: { code?: string; message?: string; hint?: string } | null, creatorIdExists: boolean) {
  if (process.env.NODE_ENV !== "development" || !error) return;
  console.error(JSON.stringify({ event: "creator_provider_accounts_query_failed", query, table, code: error.code ?? null, message: safeErrorText(error.message), hint: safeErrorText(error.hint), creatorIdExists }));
}

/** The single metric-independent account read used by Platforms and Dashboard. */
export async function getCreatorProviderAccounts(db: SupabaseClient<Database>, creatorId: string) {
  const [connectionsResult, assetsResult, identitiesResult] = await Promise.all([
    db.from("connected_accounts").select(creatorProviderAccountSelect).eq("creator_id", creatorId).order("position").limit(50),
    db.from("provider_asset_bindings").select("connected_account_id,provider,display_name,display_handle,verification_status,authority_status,detection_enabled,last_successful_sync_at").eq("creator_id", creatorId).limit(100),
    db.from("creator_identity_accounts").select("source_connection_id,provider,display_name,display_handle,verification_status,official,primary_for_provider,account_kind,last_synced_at").eq("creator_id", creatorId).limit(100),
  ]);
  logProviderQueryError("connected_accounts", "connected_accounts", connectionsResult.error, Boolean(creatorId));
  logProviderQueryError("provider_asset_bindings", "provider_asset_bindings", assetsResult.error, Boolean(creatorId));
  logProviderQueryError("creator_identity_accounts", "creator_identity_accounts", identitiesResult.error, Boolean(creatorId));
  if (connectionsResult.error || assetsResult.error || identitiesResult.error) throw new Error("creator_provider_accounts_query_failed");

  const connections = connectionsResult.data ?? [];
  const assets = assetsResult.data ?? [];
  const identities = identitiesResult.data ?? [];
  const accounts = createCreatorAccountProjection(creatorId, connections, assets, identities);
  const mainAccount = resolveCreatorMain(accounts);
  const backupAccounts = resolveCreatorBackups(accounts);
  const configuredConnections = connections.filter((connection) => creatorConnectionProjectionState(connection, assets, identities).active);

  if (process.env.NODE_ENV === "development") {
    for (const row of connections) {
      const normalized = accounts.find((account) => account.provider === row.platform && account.displayName === (identities.find((item) => item.source_connection_id === row.id)?.display_name ?? assets.find((item) => item.connected_account_id === row.id)?.display_name ?? row.label));
      const rejectionCode = !normalized ? "unsupported_provider" : normalized.archived ? "archived" : normalized.revoked ? "revoked" : !normalized.connected ? "explicitly_disconnected" : null;
      console.info(JSON.stringify({
        event: "creator_provider_account_projection",
        accountSource: row.provider_status === "configuration_pending" ? "configured_account" : "provider_connection",
        normalizedProvider: normalized?.provider ?? null,
        normalizedRole: normalized?.role ?? null,
        primary: normalized?.primary ?? false,
        official: normalized?.role === "official",
        archived: normalized?.archived ?? false,
        revoked: normalized?.revoked ?? false,
        accepted: Boolean(normalized && !rejectionCode),
        rejectionCode,
      }));
    }
  }

  return { connections, configuredConnections, assets, identities, accounts, mainAccount, backupAccounts };
}

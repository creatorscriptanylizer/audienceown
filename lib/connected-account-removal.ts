import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { deleteCreatorYouTubeAuthorizedData } from "@/lib/youtube-data-deletion";
import { createTraceId, debugDatabaseError, debugStep } from "@/lib/debug";

type AdminClient = SupabaseClient<Database>;

/** Removes one exact creator-owned connection and all provider state attached to it. */
export async function removeCreatorConnectedAccount(admin: AdminClient, creatorId: string, connectionId: string) {
  const traceId = createTraceId("rm");
  const context = { traceId, area:"connected_account_removal", creatorId, connectionId };
  debugStep("providers", "remove_request", context).success();
  const authorization = debugStep("providers", "authorization_check", context);
  const lookup = debugStep("providers", "connection_lookup", context);
  const owned = await admin.from("connected_accounts")
    .select("id,platform,account_type,is_primary")
    .eq("id", connectionId).eq("creator_id", creatorId).maybeSingle();
  if (owned.error) { authorization.failed(owned.error); lookup.failed(owned.error); debugDatabaseError("connected_accounts.select", "connected_accounts", owned.error, context); throw owned.error; }
  authorization.success(); lookup.success({ provider:owned.data?.platform, role:owned.data?.account_type });
  if (!owned.data) return { status: "not_found" as const };
  const ownedContext = { ...context, provider:owned.data.platform, role:owned.data.account_type };

  if (owned.data.platform === "youtube") {
    // Legacy lifecycle name: step:"provider_cleanup_start"
    const result = await deleteCreatorYouTubeAuthorizedData(admin, creatorId, connectionId, "remove_account");
    debugStep("providers", "remove_success", ownedContext).success({ deleted:result.status === "disconnected" });
    return result;
  }

  const disabled = await admin.from("connected_accounts").update({
    watch_enabled: false, auto_send: false, next_sync_at: null, poll_claimed_until: null,
    lease_owner: null, lease_expires_at: null, connection_health: "revoked",
  }).eq("id", connectionId).eq("creator_id", creatorId);
  if (disabled.error) { debugDatabaseError("connected_accounts.update", "connected_accounts", disabled.error, ownedContext); throw disabled.error; }
  const credentialLookup = debugStep("providers", "credential_lookup", ownedContext); credentialLookup.success();
  const secretDelete = debugStep("providers", "secret_delete", ownedContext);
  const secrets = await admin.from("platform_connection_secrets").delete().eq("platform_connection_id", connectionId);
  if (secrets.error) { secretDelete.failed(secrets.error); debugDatabaseError("platform_connection_secrets.delete", "platform_connection_secrets", secrets.error, ownedContext); throw secrets.error; }
  secretDelete.success({ deleted:true });
  const accountDelete = debugStep("providers", "connected_account_delete", ownedContext);
  const removed = await admin.from("connected_accounts").delete().eq("id", connectionId).eq("creator_id", creatorId).select("id").maybeSingle();
  if (removed.error) { accountDelete.failed(removed.error); debugDatabaseError("connected_accounts.delete", "connected_accounts", removed.error, ownedContext); throw removed.error; }
  if (!removed.data) { const error = new Error("no_row_deleted"); accountDelete.failed(error, { reason:"no_row_deleted", deleted:false }); throw new Error("connected_account_not_deleted", { cause:error }); }
  accountDelete.success({ deleted:true });
  debugStep("providers", "remove_success", ownedContext).success({ deleted:true });
  return { status: "disconnected" as const };
}

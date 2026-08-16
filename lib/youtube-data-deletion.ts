import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { decryptSocialSecret } from "@/lib/social-secrets";
import { revokeGoogleToken } from "@/lib/youtube-oauth";
import { createTraceId, debugDatabaseError, debugStep } from "@/lib/debug";

type AdminClient = SupabaseClient<Database>;
export type YouTubeDeletionMode = "keep_manual" | "remove_account";

async function requireOwnedYouTubeConnection(admin: AdminClient, creatorId: string, connectionId: string) {
  const result = await admin.from("connected_accounts")
    .select("id,url,label,is_public,platform_connection_secrets(access_token_ciphertext,refresh_token_ciphertext)")
    .eq("id", connectionId).eq("creator_id", creatorId).eq("platform", "youtube").maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

export async function deleteCreatorYouTubeAuthorizedData(admin: AdminClient, creatorId: string, connectionId: string, mode: YouTubeDeletionMode, suppliedTraceId?: string) {
  const traceId = suppliedTraceId ?? createTraceId("rm");
  const context = { traceId, area:"connected_account_removal", creatorId, connectionId, provider:"youtube", role:"official" };
  // Legacy lifecycle names retained for diagnostic compatibility: step:"credentials_lookup" step:"credentials_absent" step:"local_cleanup_start" step:"connected_account_delete_start" step:"connected_account_delete_result"
  const credentialLookup = debugStep("providers", "credential_lookup", context);
  const connection = await requireOwnedYouTubeConnection(admin, creatorId, connectionId);
  if (!connection) { credentialLookup.success({ reason:"credentials_absent" }); return { status: "already_disconnected" as const }; }
  credentialLookup.success();

  await admin.from("connected_accounts").update({ watch_enabled: false, auto_send: false, next_sync_at: null,
    poll_claimed_until: null, lease_owner: null, lease_expires_at: null, connection_health: "revoked",
    provider_status: "configuration_pending", last_connection_error: "Google authorization revocation is being processed." })
    .eq("id", connectionId).eq("creator_id", creatorId);

  const secret = Array.isArray(connection.platform_connection_secrets)
    ? connection.platform_connection_secrets[0] : connection.platform_connection_secrets;
  if (secret) {
    const ciphertext = secret.refresh_token_ciphertext || secret.access_token_ciphertext;
    let revocation: Awaited<ReturnType<typeof revokeGoogleToken>> = { status: "pending" };
    const revoke = debugStep("providers", "provider_revoke", context);
    try { revocation = await revokeGoogleToken(decryptSocialSecret(ciphertext)); revoke.success({ status:revocation.status }); } catch (error) { revoke.failed(error); }
    // A real, still-stored credential remains pending when Google is temporarily
    // unavailable. If the secret was already removed, there is nothing left to
    // revoke and local cleanup must continue through physical row deletion.
    if (revocation.status === "pending")
      return { status: "revocation_pending" as const };
  }

  const detachment = debugStep("providers", "historical_detachment", context);
  const metricIds = await admin.from("provider_audience_metrics").select("id")
    .eq("creator_id", creatorId).eq("provider", "youtube").eq("connection_id", connectionId);
  if (metricIds.error) throw metricIds.error;
  if (metricIds.data.length) {
    const snapshots = await admin.from("provider_audience_metric_snapshots").delete().in("metric_id", metricIds.data.map((item) => item.id));
    if (snapshots.error) throw snapshots.error;
  }
  const metrics = await admin.from("provider_audience_metrics").delete().eq("creator_id", creatorId).eq("provider", "youtube").eq("connection_id", connectionId);
  if (metrics.error) throw metrics.error;
  const imported = await admin.from("imported_social_content").delete().eq("platform_connection_id", connectionId);
  if (imported.error) throw imported.error;
  const events = await admin.from("social_detection_events").delete().eq("creator_id", creatorId).eq("platform_connection_id", connectionId);
  if (events.error) throw events.error;
  const updates = await admin.from("creator_updates").update({ source_provider: null, source_external_id: null,
    source_published_at: null, source_metadata: {}, media_url: null }).eq("creator_id", creatorId).eq("source_provider", "youtube");
  if (updates.error) throw updates.error;
  detachment.success();
  const secretDelete = debugStep("providers", "secret_delete", context);
  const secrets = await admin.from("platform_connection_secrets").delete().eq("platform_connection_id", connectionId);
  if (secrets.error) { secretDelete.failed(secrets.error); debugDatabaseError("platform_connection_secrets.delete", "platform_connection_secrets", secrets.error, context); throw secrets.error; }
  secretDelete.success({ deleted:true });

  if (mode === "remove_account") {
    const accountDelete = debugStep("providers", "connected_account_delete", context);
    const removed = await admin.from("connected_accounts").delete().eq("id", connectionId).eq("creator_id", creatorId).select("id").maybeSingle();
    if (removed.error) { accountDelete.failed(removed.error); throw removed.error; }
    if (!removed.data) accountDelete.failed(new Error("no_row_deleted"), { reason:"no_row_deleted", deleted:false });
    if (!removed.data) throw new Error("connected_account_not_deleted");
    accountDelete.success({ deleted:true });
  } else {
    const manual = await admin.from("connected_accounts").update({ label: `${connection.label.replace(/\s*\(Manually added\)$/i, "")} (Manually added)`,
      external_account_id: null, external_account_name: null, provider_metadata: {}, granted_scopes: [], token_expires_at: null,
      token_refreshed_at: null, last_sync_at: null, last_external_cursor: null, connection_health: "disconnected",
      last_connection_error: null, watch_enabled: false, auto_send: false, provider_status: "configuration_pending" })
      .eq("id", connectionId).eq("creator_id", creatorId);
    if (manual.error) throw manual.error;
  }
  return { status: "disconnected" as const };
}

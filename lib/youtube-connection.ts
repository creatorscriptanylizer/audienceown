import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { encryptSocialSecret } from "@/lib/social-secrets";
import { normalizeProviderAudience } from "@/lib/platform-audience/normalize";
import { nextAudienceSync } from "@/lib/platform-audience/server";
import { revalidateCreatorAccounts } from "@/lib/social-providers/creator-account-revalidation";
import { logProviderOperation } from "@/lib/social-providers/authorized-credential";
import { removeCreatorConnectedAccount } from "@/lib/connected-account-removal";
import type { YouTubeAccountRole } from "@/lib/youtube-oauth";
import type { YouTubeChannelIdentity } from "@/lib/youtube-watcher";
import { debugDatabaseError, debugStep } from "@/lib/debug";
import { isConnectionLimitError } from "@/lib/provider-entitlements";
import {canonicalAccountConnected} from "@/lib/social-providers/connection-health";

type Admin = SupabaseClient<Database>;
type ConnectionStep = "existing_connection_lookup" | "duplicate_channel_lookup" | "stale_connection_cleanup" | "connection_insert" |
  "connection_update" | "secret_persist" | "secret_encrypt" | "secret_db_write" |
  "audience_metric_upsert" | "audience_snapshot_append" |
  "last_sync_update" | "revalidation";
type PostgrestFailure = { code?: string; message?: string; details?: string; hint?: string };

export type YouTubeConnectionTokens = {
  accessToken: string;
  refreshToken?: string;
  scope: string;
  tokenType: string;
  expiresAt: string;
};

export class YouTubeConnectionError extends Error {
  readonly postgresCode?: string;
  readonly details?: string;
  readonly hint?: string;

  constructor(
    public code: "already_connected" | "reconnect_mismatch" | "invalid_reconnect" | "connection_limit_reached" | "connection_failed",
    public step?: ConnectionStep,
    failure?: PostgrestFailure | null,
  ) {
    super(failure?.message ?? code);
    this.name = "YouTubeConnectionError";
    this.postgresCode = failure?.code;
    this.details = failure?.details;
    this.hint = failure?.hint;
  }
}

function failed(step: ConnectionStep, failure?: PostgrestFailure | null): never {
  throw new YouTubeConnectionError("connection_failed", step, failure);
}

function safeFailure(error: unknown): PostgrestFailure {
  if (error instanceof Error) return { message:error.message };
  if (error && typeof error === "object") return error as PostgrestFailure;
  return { message:"Unknown connection persistence failure." };
}

async function removeStaleOfficialConnections(admin: Admin, creatorId: string, traceId: string) {
  const diagnostic = debugStep("oauth", "stale_connection_cleanup", { traceId, area:"youtube_oauth", creatorId });
  const official = await admin.from("connected_accounts")
    .select("id,connection_health,provider_status,is_primary")
    .eq("creator_id", creatorId).eq("platform", "youtube").eq("account_type", "official");
  if (official.error) { diagnostic.failed(official.error); failed("existing_connection_lookup", official.error); }

  for (const connection of official.data ?? []) {
    if (!connection.is_primary || connection.connection_health !== "revoked" || connection.provider_status !== "configuration_pending") continue;
    const secret = await admin.from("platform_connection_secrets").select("platform_connection_id")
      .eq("platform_connection_id", connection.id).maybeSingle();
    if (secret.error) failed("existing_connection_lookup", secret.error);
    if (!secret.data) {
      try {
        const removal = await removeCreatorConnectedAccount(admin, creatorId, connection.id);
        if (removal.status !== "disconnected" && removal.status !== "not_found") failed("existing_connection_lookup");
      } catch (error) {
        failed("existing_connection_lookup", error as PostgrestFailure);
      }
    }
  }
  diagnostic.success();
}

async function compensateFailedInsert(admin: Admin, creatorId: string, connectionId: string) {
  const removed = await admin.from("connected_accounts").delete().eq("id", connectionId).eq("creator_id", creatorId);
  if (!removed.error) return;
  // If historical trigger/FK state unexpectedly blocks deletion, release the
  // primary slot and make the incomplete connection unequivocally inactive.
  await admin.from("connected_accounts").update({
    is_primary: false, connection_health: "revoked", provider_status: "configuration_pending",
    watch_enabled: false, auto_create_drafts: false, auto_send: false,
  }).eq("id", connectionId).eq("creator_id", creatorId);
  await admin.from("platform_connection_secrets").delete().eq("platform_connection_id", connectionId);
}

export async function persistYouTubeConnection(input: {
  admin: Admin; creatorId: string; role: YouTubeAccountRole; reconnectConnectionId?: string; protectedOfficialAccountId?: string;
  channel: YouTubeChannelIdentity; tokens: YouTubeConnectionTokens; traceId?: string;
}) {
  const { admin, creatorId, role, reconnectConnectionId, protectedOfficialAccountId, channel, tokens } = input;
  const traceId = input.traceId ?? "yt_internal";
  const context = { traceId, area:"youtube_oauth", creatorId, channelId:channel.id, role };
  let diagnostic = debugStep("oauth", "existing_connection_lookup", context);
  const target = reconnectConnectionId
    ? await admin.from("connected_accounts").select("id,account_type,is_public,provider_metadata,external_account_id")
      .eq("id", reconnectConnectionId).eq("creator_id", creatorId).eq("platform", "youtube").maybeSingle()
    : { data: null, error: null };
  if (target.error) { diagnostic.failed(target.error); debugDatabaseError("connected_accounts.select", "connected_accounts", target.error, context); failed("existing_connection_lookup", target.error); }
  diagnostic.success();
  if (reconnectConnectionId && (!target.data || target.data.account_type !== role)) throw new YouTubeConnectionError("invalid_reconnect", "existing_connection_lookup");
  if (target.data?.external_account_id && target.data.external_account_id !== channel.id) throw new YouTubeConnectionError("reconnect_mismatch", "existing_connection_lookup");
  if(role==="backup"&&protectedOfficialAccountId){
    const official=await admin.from("connected_accounts").select("id,url,external_account_id,connection_health,provider_status").eq("id",protectedOfficialAccountId).eq("creator_id",creatorId).eq("platform","youtube").eq("account_type","official").maybeSingle();
    if(official.error||!official.data||!canonicalAccountConnected({health:official.data.connection_health,providerStatus:official.data.provider_status,hasPublicUrl:Boolean(official.data.url),hasExternalAccountId:Boolean(official.data.external_account_id)}))throw new YouTubeConnectionError("connection_failed","existing_connection_lookup",official.error);
  }

  diagnostic = debugStep("oauth", "duplicate_channel_lookup", context);
  const duplicate = await admin.from("connected_accounts").select("id")
    .eq("creator_id", creatorId).eq("platform", "youtube").eq("external_account_id", channel.id).limit(1).maybeSingle();
  if (duplicate.error) { diagnostic.failed(duplicate.error); debugDatabaseError("connected_accounts.select", "connected_accounts", duplicate.error, context); failed("duplicate_channel_lookup", duplicate.error); }
  diagnostic.success();
  if (duplicate.data && duplicate.data.id !== reconnectConnectionId) throw new YouTubeConnectionError("already_connected", "duplicate_channel_lookup");

  if (!target.data && role === "official") await removeStaleOfficialConnections(admin, creatorId, traceId);

  const metadata = target.data?.provider_metadata && typeof target.data.provider_metadata === "object" && !Array.isArray(target.data.provider_metadata)
    ? target.data.provider_metadata as Record<string, unknown> : {};
  const now = new Date().toISOString();
  const providerValues = {
    url: `https://www.youtube.com/channel/${channel.id}`,
    external_account_url: `https://www.youtube.com/channel/${channel.id}`,
    connection_health: "healthy", last_connection_error: null,
    external_account_id: channel.id, external_account_name: channel.title,
    provider_metadata: { ...metadata, uploads_playlist_id: channel.uploadsPlaylistId },
    granted_scopes: tokens.scope.split(/\s+/).filter(Boolean), provider_status: "ready",
    watch_enabled: true, auto_create_drafts: true,
    token_expires_at: tokens.expiresAt, token_refreshed_at: now,
    protected_official_account_id: role==="backup"?protectedOfficialAccountId??null:null,
  };
  const lastBackup = !target.data && role === "backup"
    ? await admin.from("connected_accounts").select("position").eq("creator_id", creatorId).eq("account_type", "backup").order("position", { ascending: false }).limit(1).maybeSingle()
    : { data: null, error: null };
  if (lastBackup.error) failed("existing_connection_lookup", lastBackup.error);
  const writeStep = target.data ? "connection_update" : "connection_insert";
  diagnostic = debugStep("oauth", writeStep, context);
  const write = target.data
    ? await admin.from("connected_accounts").update(providerValues).eq("id", target.data.id).eq("creator_id", creatorId).select("id").single()
    : await admin.from("connected_accounts").insert({
      ...providerValues, creator_id: creatorId, platform: "youtube", account_type: role,
      label: channel.title, is_primary: role === "official", is_public: true,
      position: role === "official" ? 0 : Math.min((lastBackup.data?.position ?? 0) + 1, 1000), auto_send: false,
    }).select("id").single();
  if (write.error || !write.data) { diagnostic.failed(write.error ?? new Error("No row returned")); debugDatabaseError(`connected_accounts.${target.data ? "update" : "insert"}`, "connected_accounts", write.error ?? new Error("No row returned"), context);if(isConnectionLimitError(write.error))throw new YouTubeConnectionError("connection_limit_reached",writeStep,write.error);failed(writeStep, write.error); }
  diagnostic.success({ connectionId:write.data.id });
  if (process.env.NODE_ENV === "development" && role === "backup") console.info("youtube_backup_verify", { step:"connection_updated", connectionId:write.data.id });
  const createdConnection = !target.data;

  try {
    const previousSecret = await admin.from("platform_connection_secrets").select("refresh_token_ciphertext")
      .eq("platform_connection_id", write.data.id).maybeSingle();
    if (previousSecret.error) failed("secret_db_write", previousSecret.error);
    diagnostic = debugStep("oauth", "secret_encrypt", { ...context, connectionId:write.data.id });
    let accessTokenCiphertext: string;
    let refreshTokenCiphertext: string | null;
    try {
      accessTokenCiphertext = encryptSocialSecret(tokens.accessToken);
      refreshTokenCiphertext = tokens.refreshToken
        ? encryptSocialSecret(tokens.refreshToken)
        : previousSecret.data?.refresh_token_ciphertext ?? null;
      diagnostic.success();
    } catch (error) {
      diagnostic.failed(error);
      failed("secret_encrypt", safeFailure(error));
    }
    diagnostic = debugStep("oauth", "secret_db_write", { ...context, connectionId:write.data.id });
    const secretWrite = await admin.from("platform_connection_secrets").upsert({
      platform_connection_id: write.data.id,
      access_token_ciphertext: accessTokenCiphertext,
      refresh_token_ciphertext: refreshTokenCiphertext,
      token_scope: tokens.scope, token_type: tokens.tokenType,
    });
    if (secretWrite.error) {
      diagnostic.failed(secretWrite.error);
      debugDatabaseError("platform_connection_secrets.upsert", "platform_connection_secrets", secretWrite.error, { ...context, connectionId:write.data.id });
      failed("secret_db_write", secretWrite.error);
    }
    diagnostic.success();
    if (process.env.NODE_ENV === "development" && role === "backup") console.info("youtube_backup_verify", { step:"secret_persisted", connectionId:write.data.id });

    const normalized = normalizeProviderAudience("youtube", { items: [{ statistics: {
      subscriberCount: channel.subscriberCount ?? undefined, hiddenSubscriberCount: channel.hiddenSubscriberCount,
    } }] });
    diagnostic = debugStep("oauth", "audience_normalization", { ...context, connectionId:write.data.id });
    diagnostic.success({ status:normalized.status });
    diagnostic = debugStep("oauth", "audience_metric_write", { ...context, connectionId:write.data.id });
    const metric = await admin.rpc("upsert_provider_audience_metric", {
      p_creator_id: creatorId, p_connection_id: write.data.id, p_asset_binding_id: null as unknown as string,
      p_provider: "youtube", p_account_category: role, p_count: normalized.count as number,
      p_unit: "subscribers", p_status: normalized.status, p_approximate: normalized.approximate,
      p_source_observed_at: now, p_next_sync_at: nextAudienceSync("youtube"), p_error_code: null as unknown as string,
    });
    if (metric.error) { diagnostic.failed(metric.error); debugDatabaseError("upsert_provider_audience_metric", "provider_audience_metrics", metric.error, context); failed("audience_metric_upsert", metric.error); }
    diagnostic.success();
    if (process.env.NODE_ENV === "development" && role === "backup") console.info("youtube_backup_verify", { step:"audience_metric_written", connectionId:write.data.id, category:"backup", count:normalized.count, status:normalized.status });
    if (normalized.count !== null) {
      diagnostic = debugStep("oauth", "audience_snapshot", { ...context, connectionId:write.data.id });
      const snapshot = await admin.rpc("append_provider_audience_snapshot", { p_metric_id: metric.data });
      if (snapshot.error) { diagnostic.failed(snapshot.error); failed("audience_snapshot_append", snapshot.error); }
      diagnostic.success();
    }
    diagnostic = debugStep("oauth", "last_sync_update", { ...context, connectionId:write.data.id });
    const sync = await admin.from("connected_accounts").update({ last_sync_at: now }).eq("id", write.data.id);
    if (sync.error) { diagnostic.failed(sync.error); failed("last_sync_update", sync.error); }
    diagnostic.success();
    diagnostic = debugStep("oauth", "identity_revalidation", { ...context, connectionId:write.data.id });
    const identity = await admin.rpc("sync_identity_account_from_connection", { p_connection_id:write.data.id });
    if (identity.error) { diagnostic.failed(identity.error); failed("revalidation", identity.error); }
    diagnostic.success();
    logProviderOperation("connection_established", { provider: "youtube", connectionId: write.data.id });
    diagnostic = debugStep("oauth", "cache_revalidation", { ...context, connectionId:write.data.id });
    revalidateCreatorAccounts(creatorId);
    diagnostic.success();
    return { connectionId: write.data.id };
  } catch (error) {
    if (createdConnection) await compensateFailedInsert(admin, creatorId, write.data.id);
    throw error;
  }
}

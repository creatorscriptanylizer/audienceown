import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCreator, getViewer } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSocialSecret } from "@/lib/social-secrets";
import { exchangeYouTubeCode, inspectYouTubeOAuthState, validateYouTubeGrantedScopes } from "@/lib/youtube-oauth";
import { getYouTubeChannels } from "@/lib/youtube-watcher";
import { persistYouTubeConnection, YouTubeConnectionError } from "@/lib/youtube-connection";
import { normalizeProviderFailure } from "@/lib/social-providers/errors";
import { createTraceId, debugError, debugStep } from "@/lib/debug";
import { appUrl } from "@/lib/app-url";
import { canCreateProviderConnection } from "@/lib/provider-entitlements";
import { applyRecoveryAutoLinkIntent } from "@/lib/social-providers/recovery-auto-link";

export const runtime = "nodejs";

function dashboard(status: string, pendingSelectionId?: string, connectionId?:string) {
  const destination = new URL("/dashboard/platforms", appUrl());
  destination.searchParams.set("youtube", status);
  if (pendingSelectionId) destination.searchParams.set("pendingSelectionId", pendingSelectionId);
  if(connectionId)destination.searchParams.set("connectionId",connectionId);
  return NextResponse.redirect(destination);
}

function safeStage(stage: string, metadata: Record<string, unknown> = {}) {
  console.info("youtube_oauth_callback", { stage, ...metadata });
}

export async function GET(request: Request) {
  const traceId = createTraceId("yt");
  const callbackDiagnostic = debugStep("oauth", "callback_started", { traceId, area:"youtube_oauth" });
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateValue = url.searchParams.get("state");
  const store = await cookies();
  const nonce = store.get("youtube_oauth_nonce")?.value;
  const sessionPresent = typeof store.getAll === "function" && store.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("auth-token"));
  store.delete("youtube_oauth_nonce");
  safeStage("callback_started", { callbackOrigin:url.origin });
  callbackDiagnostic.success();
  let diagnostic = debugStep("oauth", "state_validation", { traceId, area:"youtube_oauth" });
  const inspected = stateValue ? inspectYouTubeOAuthState(stateValue, nonce ?? null) : { state:null, signatureValid:false, expired:false, nonceMatches:false };
  const state = inspected.state;
  const [user, creator] = await Promise.all([getViewer(), getCreator()]);
  safeStage("viewer_resolution", { sessionPresent, viewerResolved:Boolean(user), creatorResolved:Boolean(creator) });
  safeStage("state_validation", {
    stateSignatureValid:inspected.signatureValid,
    stateExpired:inspected.expired,
    stateUserMatchesViewer:Boolean(state && user && state.userId === user.id),
    stateCreatorMatchesViewer:Boolean(state && creator && state.creatorId === creator.id),
    noncePresent:Boolean(nonce),
    nonceMatches:inspected.nonceMatches,
    callbackOrigin:url.origin,
  });
  if (!stateValue || !nonce) {
    diagnostic.failed(new Error("OAuth continuity missing"), { category:"session_continuity", providerStatus:"authorization_failed" });
    return dashboard("authorization_failed");
  }
  if (!state || !inspected.signatureValid || inspected.expired || !inspected.nonceMatches) { diagnostic.failed(new Error("Invalid OAuth state"), { category:"state_validation", providerStatus:"invalid_state" }); return dashboard("invalid_state"); }
  const finish = (status:string,pendingSelectionId?:string,connectionId?:string) => {
    if(state.returnTo!=="onboarding")return dashboard(status,pendingSelectionId,connectionId);
    const destination=new URL(`/onboarding/accounts?step=${state.role}&oauth=youtube:${status}`,appUrl());
    if(pendingSelectionId)destination.searchParams.set("pendingSelectionId",pendingSelectionId);
    return NextResponse.redirect(destination);
  };
  if (!code || url.searchParams.has("error")) { safeStage("state_validation", { category:"provider_denial", providerStatus:"authorization_failed" }); return finish("authorization_failed"); }
  diagnostic.success({ role:state.role });
  if (process.env.NODE_ENV === "development" && state.role === "backup") console.info("youtube_backup_verify", { step:"oauth_state_verified", connectionId:state.connectionId ?? null, role:state.role });
  const viewerDiagnostic = debugStep("oauth", "viewer_lookup", { traceId, area:"youtube_oauth", role:state.role });
  const creatorDiagnostic = debugStep("oauth", "creator_lookup", { traceId, area:"youtube_oauth", role:state.role });
  if (user) viewerDiagnostic.success(); else viewerDiagnostic.failed(new Error("Viewer not found"));
  if (creator) creatorDiagnostic.success({ creatorId:creator.id }); else creatorDiagnostic.failed(new Error("Creator not found"));
  if (!user || !creator || state.userId !== user.id || state.creatorId !== creator.id) return finish("invalid_state");
  const admin = createAdminClient();
  if (!admin) return finish("not_configured");
  const entitlement = await canCreateProviderConnection(creator.id, state.role, state.connectionId ? "reconnect" : "new_connection", user);
  safeStage("entitlement_recheck", { allowed:entitlement.allowed, role:state.role });
  if (!entitlement.allowed) return finish("connection_limit_reached");
  let discoveredChannelId: string | undefined;
  let backupFailureStep = "callback";

  try {
    const reconnect = state.connectionId
      ? await admin.from("connected_accounts").select("id,account_type,external_account_id,connection_health,provider_status")
        .eq("id", state.connectionId).eq("creator_id", creator.id).eq("platform", "youtube").maybeSingle()
      : { data: null, error: null };
    if (reconnect.error) throw new Error("connection_lookup_failed");
    if (state.connectionId && (!reconnect.data || reconnect.data.account_type !== state.role)) return finish("invalid_state");
    if (state.role === "backup" && process.env.NODE_ENV === "development") console.info("youtube_backup_verify", { step:"target_loaded", connectionId:state.connectionId ?? null, targetExternalAccountId:reconnect.data?.external_account_id ?? null, targetRole:reconnect.data?.account_type ?? null, targetHealth:reconnect.data?.connection_health ?? null, targetProviderStatus:reconnect.data?.provider_status ?? null });

    backupFailureStep = "code_exchange";
    diagnostic = debugStep("oauth", "token_exchange", { traceId, area:"youtube_oauth", creatorId:creator.id, role:state.role });
    safeStage("token_exchange", { status:"started" });
    const tokens = await exchangeYouTubeCode(code);
    diagnostic.success();
    safeStage("token_exchange", { status:"success" });
    backupFailureStep = "scope_validation";
    diagnostic = debugStep("oauth", "scope_validation", { traceId, area:"youtube_oauth", creatorId:creator.id, role:state.role });
    safeStage("scope_validation", { status:"started" });
    const scopeValidation = validateYouTubeGrantedScopes(tokens.scope);
    const grantedScopes = scopeValidation.grantedScopes;
    if (!scopeValidation.valid) {
      const scopeError = new Error(scopeValidation.failure ?? "scope_validation_failed");
      diagnostic.failed(scopeError, { category:scopeValidation.failure });
      throw scopeError;
    }
    diagnostic.success();
    safeStage("scope_validation", { status:"success" });
    backupFailureStep = "channel_lookup";
    diagnostic = debugStep("oauth", "channel_lookup", { traceId, area:"youtube_oauth", creatorId:creator.id, role:state.role });
    safeStage("channel_lookup", { status:"started" });
    const channels = await getYouTubeChannels(tokens.access_token);
    diagnostic.success({ count:channels.length });
    safeStage("channel_lookup", { status:"success", channelCount:channels.length });
    discoveredChannelId = channels.length === 1 ? channels[0].id : undefined;
    console.info("provider_oauth", { event: "youtube_channels_discovered", provider: "youtube", role: state.role, channelCount: channels.length });
    if (channels.length === 0) return finish("no_channel");
    if (state.role === "backup" && process.env.NODE_ENV === "development" && channels.length === 1) console.info("youtube_backup_verify", { step:"channel_discovered", connectionId:state.connectionId ?? null, channelId:channels[0].id, channelTitle:channels[0].title, subscriberCount:channels[0].subscriberCount, hiddenSubscriberCount:channels[0].hiddenSubscriberCount });

    if (reconnect.data) {
      const reconnectTarget = reconnect.data;
      const channel = channels.find((candidate) => candidate.id === reconnectTarget.external_account_id);
      if (state.role === "backup" && process.env.NODE_ENV === "development") console.info("youtube_backup_verify", { step:"identity_match", connectionId:reconnectTarget.id, expectedChannelId:reconnectTarget.external_account_id, actualChannelId:channels.length === 1 ? channels[0].id : null, matches:Boolean(channel) });
      if (!channel) {
        if (state.role === "backup" && process.env.NODE_ENV === "development") console.error("youtube_backup_verify_failed", { step:"identity_match", connectionId:reconnectTarget.id, role:state.role, errorName:"YouTubeConnectionError", errorMessage:"reconnect_mismatch", errorCode:"reconnect_mismatch", cause:null });
        return finish("reconnect_mismatch");
      }
      backupFailureStep = "connection_persistence";
      safeStage("persistence", { status:"started", role:state.role });
      const persisted = await persistYouTubeConnection({
        admin, creatorId: creator.id, role: state.role, reconnectConnectionId: reconnectTarget.id, protectedOfficialAccountId:state.protectedOfficialAccountId, channel,
        tokens: { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, scope: tokens.scope!, tokenType: tokens.token_type ?? "Bearer", expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString() },
        traceId,
      });
      safeStage("persistence", { status:"success", role:state.role });
      const autoLink=await applyRecoveryAutoLinkIntent(admin,{creatorId:creator.id,connectedAccountId:persisted.connectionId,provider:"youtube",role:state.role,recoveryForMainAccountId:state.recoveryForMainAccountId});
      debugStep("oauth", "callback_success", { traceId, area:"youtube_oauth", creatorId:creator.id, role:state.role, channelId:channel.id }).success();
      if (state.role === "backup" && process.env.NODE_ENV === "development") console.info("youtube_backup_verify", { step:"complete", connectionId:reconnectTarget.id });
      safeStage("complete", { status:"connected", role:state.role });
      return finish(autoLink==="linked"||autoLink==="existing"?"connected_recovery_linked":autoLink==="failed"?"connected_recovery_link_failed":"connected",undefined,persisted.connectionId);
    }

    if (channels.length === 1) {
      safeStage("persistence", { status:"started", role:state.role });
      const persisted = await persistYouTubeConnection({
        admin, creatorId: creator.id, role: state.role, protectedOfficialAccountId:state.protectedOfficialAccountId, channel: channels[0],
        tokens: { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, scope: tokens.scope!, tokenType: tokens.token_type ?? "Bearer", expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString() },
        traceId,
      });
      safeStage("persistence", { status:"success", role:state.role });
      const autoLink=await applyRecoveryAutoLinkIntent(admin,{creatorId:creator.id,connectedAccountId:persisted.connectionId,provider:"youtube",role:state.role,recoveryForMainAccountId:state.recoveryForMainAccountId});
      debugStep("oauth", "callback_success", { traceId, area:"youtube_oauth", creatorId:creator.id, role:state.role, channelId:channels[0].id }).success();
      safeStage("complete", { status:"connected", role:state.role });
      return finish(autoLink==="linked"||autoLink==="existing"?"connected_recovery_linked":autoLink==="failed"?"connected_recovery_link_failed":"connected",undefined,persisted.connectionId);
    }

    const pendingSelectionId = randomUUID();
    const pending = await admin.from("youtube_oauth_pending_selections").insert({
      id: pendingSelectionId, creator_id: creator.id, user_id: user.id, requested_role: state.role,
      reconnect_connection_id: null,
      protected_official_account_id: state.protectedOfficialAccountId??null,
      recovery_for_main_account_id:state.recoveryForMainAccountId??null,
      access_token_ciphertext: encryptSocialSecret(tokens.access_token),
      refresh_token_ciphertext: tokens.refresh_token ? encryptSocialSecret(tokens.refresh_token) : null,
      granted_scopes: grantedScopes, token_type: tokens.token_type ?? "Bearer",
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      eligible_channels: channels, expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    if (pending.error) throw new Error("pending_selection_write_failed");
    return finish("select_channel", pendingSelectionId);
  } catch (error) {
    if (state.role === "backup" && process.env.NODE_ENV === "development") console.error("youtube_backup_verify_failed", {
      step: error instanceof YouTubeConnectionError ? error.step ?? backupFailureStep : backupFailureStep,
      connectionId: state.connectionId ?? null, role: state.role,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorCode: typeof error === "object" && error && "code" in error ? String(error.code) : null,
      cause: error instanceof Error && error.cause ? String(error.cause) : null,
    });
    debugError("oauth", error, { traceId, area:"youtube_oauth", step:error instanceof YouTubeConnectionError ? error.step : "callback", creatorId:creator.id, role:state.role, channelId:discoveredChannelId });
    if (error instanceof YouTubeConnectionError) {
      return finish(error.code);
    }
    const failure = normalizeProviderFailure(error);
    safeStage(error instanceof YouTubeConnectionError ? error.step ?? backupFailureStep : backupFailureStep, { category:failure.category, providerStatus:failure.code, status:"failed" });
    console.warn("provider_sync", { event: "oauth_callback_failed", provider: "youtube", category: failure.category, code: failure.code });
    return finish("connection_failed");
  }
}

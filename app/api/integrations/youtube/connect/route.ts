import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCreator, getViewer } from "@/lib/dal";
import { createYouTubeOAuthState, getYouTubeAuthorizationUrl } from "@/lib/youtube-oauth";
import { createAdminClient } from "@/lib/supabase/admin";
import { debugLog } from "@/lib/debug";
import { socialTokenEncryptionState } from "@/lib/social-secrets";
import { canCreateProviderConnection } from "@/lib/provider-entitlements";
import { canonicalAccountConnected } from "@/lib/social-providers/connection-health";
import { validateRecoveryMainContext } from "@/lib/social-providers/recovery-auto-link";
import { validateEmptyRecoveryNetwork,validateRecoveryNetwork } from "@/lib/social-providers/recovery-network-main-assignment";
import { oauthOriginCheck } from "@/lib/oauth-origin";
import { canonicalProviderHandoffUrl } from "@/lib/provider-connect-handoff";

export const runtime = "nodejs";

function platforms(request: Request, status: string) {
  return NextResponse.redirect(new URL(`/dashboard/platforms?youtube=${status}`, request.url));
}

export async function GET(request: Request) {
  const origin = oauthOriginCheck(request);
  debugLog("oauth", { area:"youtube_oauth", step:"canonical_origin_check", callbackOrigin:origin.externalOrigin, configuredOrigin:origin.configuredOrigin, originAccepted:!origin.redirectRequired });
  if (origin.redirectRequired) {
    const requestedRole = new URL(request.url).searchParams.get("role") ?? "official";
    if (requestedRole !== "official" && requestedRole !== "backup") return platforms(request, "invalid_request");
    return NextResponse.redirect(canonicalProviderHandoffUrl({provider:"youtube",role:requestedRole}, origin.configuredOrigin));
  }

  const [user, creator] = await Promise.all([getViewer(), getCreator()]);
  if (!user || !creator) return NextResponse.redirect(new URL("/login?next=/dashboard/platforms", request.url));
  const url = new URL(request.url);
  const roleValue = url.searchParams.get("role");
  const role = roleValue === null ? "official" : roleValue;
  const returnTo = url.searchParams.get("returnTo") === "onboarding" ? "onboarding" as const : undefined;
  if (role !== "official" && role !== "backup") return platforms(request, "invalid_request");
  const encryptionState = socialTokenEncryptionState();
  if (encryptionState !== "configured") {
    debugLog("oauth", { area:"youtube_oauth", step:"preflight_configuration", status:"FAILED", social_token_encryption:encryptionState === "missing" ? "MISSING" : "INVALID FORMAT" });
    return platforms(request, "not_configured");
  }
  const connectionId = url.searchParams.get("connectionId") ?? undefined;
  const protectedOfficialAccountId = url.searchParams.get("protectedOfficialAccountId") ?? undefined;
  const recoveryForMainAccountId = url.searchParams.get("recoveryForMainAccountId") ?? undefined;
  const recoveryNetworkId = url.searchParams.get("recoveryNetworkId") ?? undefined;
  if (connectionId) {
    const admin = createAdminClient();
    if (!admin) return platforms(request, "not_configured");
    const { data:connection, error } = await admin.from("connected_accounts").select("id,account_type").eq("id", connectionId).eq("creator_id", creator.id).eq("platform", "youtube").maybeSingle();
    if (error) return platforms(request, "temporarily_unavailable");
    if (!connection || connection.account_type !== role) return platforms(request, "invalid_connection");
  }
  if (role === "backup" && protectedOfficialAccountId) {
    const admin = createAdminClient();
    if (!admin) return platforms(request, "not_configured");
    const { data:official, error } = await admin.from("connected_accounts").select("id,url,external_account_id,connection_health,provider_status").eq("id", protectedOfficialAccountId).eq("creator_id", creator.id).eq("platform", "youtube").eq("account_type", "official").maybeSingle();
    if (error) return platforms(request, "temporarily_unavailable");
    if (!official || !canonicalAccountConnected({ health:official.connection_health, providerStatus:official.provider_status, hasPublicUrl:Boolean(official.url), hasExternalAccountId:Boolean(official.external_account_id) })) return platforms(request, "invalid_official_account");
  }
  if(recoveryForMainAccountId){if(role!=="backup")return platforms(request,"invalid_recovery_context");const admin=createAdminClient();if(!admin)return platforms(request,"not_configured");if(!await validateRecoveryMainContext(admin,{creatorId:creator.id,mainAccountId:recoveryForMainAccountId}))return platforms(request,"invalid_recovery_context");}
  if(recoveryNetworkId){const admin=createAdminClient();if(!admin||!(role==="official"?await validateEmptyRecoveryNetwork(admin,{creatorId:creator.id,recoveryNetworkId}):await validateRecoveryNetwork(admin,{creatorId:creator.id,recoveryNetworkId})))return platforms(request,"invalid_recovery_network_context");}
  const entitlement = await canCreateProviderConnection(creator.id, role, connectionId ? "reconnect" : "new_connection", user);
  if (!entitlement.allowed) return NextResponse.redirect(new URL(returnTo ? `/onboarding/accounts?step=${role}&oauth=youtube:connection_limit_reached` : "/dashboard/platforms?youtube=connection_limit_reached", request.url));
  if (process.env.NODE_ENV === "development" && role === "backup") console.info("youtube_backup_verify", { step:"oauth_start", connectionId:connectionId ?? null, role });
  const nonce = randomBytes(24).toString("base64url");
  const state = createYouTubeOAuthState({ creatorId:creator.id, userId:user.id, nonce, expiresAt:Date.now() + 10 * 60_000, role, returnTo, ...(connectionId ? { connectionId } : {}), ...(protectedOfficialAccountId ? { protectedOfficialAccountId } : {}),...(recoveryForMainAccountId?{recoveryForMainAccountId}:recoveryNetworkId?{recoveryForMainAccountId:recoveryNetworkId}:{}) });
  const store = await cookies();
  store.set("youtube_oauth_nonce", nonce, { httpOnly:true, secure:new URL(origin.externalOrigin).protocol === "https:", sameSite:"lax", path:"/api/integrations/youtube/callback", maxAge:600 });
  return NextResponse.redirect(getYouTubeAuthorizationUrl(state));
}

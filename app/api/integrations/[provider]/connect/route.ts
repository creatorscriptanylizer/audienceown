import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCreator, getViewer } from "@/lib/dal";
import { createOAuthState, createPkce } from "@/lib/social-providers/oauth";
import { getSocialProvider } from "@/lib/social-providers/registry";
import { isSocialProvider } from "@/lib/social-providers/normalize";
import { canCreateProviderConnection } from "@/lib/provider-entitlements";
import { oauthOriginCheck } from "@/lib/oauth-origin";
import { debugLog } from "@/lib/debug";
import { canonicalAccountConnected } from "@/lib/social-providers/connection-health";
import { validateRecoveryMainContext } from "@/lib/social-providers/recovery-auto-link";
import { canonicalProviderHandoffUrl } from "@/lib/provider-connect-handoff";
import { validateEmptyRecoveryNetwork,validateRecoveryNetwork } from "@/lib/social-providers/recovery-network-main-assignment";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: raw } = await params;
  if (!isSocialProvider(raw)) return Response.json({ error:"Unknown provider" }, { status:404 });
  if (!["instagram","tiktok","x","spotify","linkedin","pinterest","twitch","discord","snapchat"].includes(raw)) return Response.json({ error:"provider_coming_soon" }, { status:409 });
  const adapter = getSocialProvider(raw);
  if (!adapter.capabilities.oauth || !adapter.createAuthorizationUrl) return Response.json({ error:"provider_capability_not_supported" }, { status:409 });
  const requestUrl = new URL(request.url);
  const requestedRole = requestUrl.searchParams.get("role") ?? "official";
  if (requestedRole !== "official" && requestedRole !== "backup") return NextResponse.redirect(new URL("/dashboard/platforms?connect=invalid_request", request.url));
  const origin = oauthOriginCheck(request);
  debugLog("oauth", { event:`${raw}_oauth_authorize`, step:"canonical_origin_check", configuredOrigin:origin.configuredOrigin, externalOrigin:origin.externalOrigin, redirectRequired:origin.redirectRequired });
  if (origin.loopDetected) return NextResponse.redirect(new URL("/dashboard/platforms?connect=invalid_request", request.url));
  if (origin.redirectRequired) return NextResponse.redirect(canonicalProviderHandoffUrl({ provider:raw, role:requestedRole }, origin.configuredOrigin));
  const [user, creator] = await Promise.all([getViewer(), getCreator()]);
  if (!user || !creator) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent("/dashboard/platforms")}`, request.url));
  const role = requestedRole;
  const connectionId = requestUrl.searchParams.get("connectionId") ?? undefined;
  const protectedOfficialAccountId = requestUrl.searchParams.get("protectedOfficialAccountId") ?? undefined;
  const recoveryForMainAccountId = requestUrl.searchParams.get("recoveryForMainAccountId") ?? undefined;
  const recoveryNetworkId = requestUrl.searchParams.get("recoveryNetworkId") ?? undefined;
  const returnTo = requestUrl.searchParams.get("returnTo") === "onboarding" ? "onboarding" as const : undefined;
  if (connectionId) {
    const db = (await import("@/lib/supabase/admin")).createAdminClient();
    const owned = db ? await db.from("connected_accounts").select("id,account_type,platform").eq("id",connectionId).eq("creator_id",creator.id).maybeSingle() : { data:null };
    if (!owned.data || owned.data.account_type !== role || owned.data.platform !== raw) return Response.json({ error:"invalid_connection" }, { status:409 });
  }
  if (role === "backup" && protectedOfficialAccountId) {
    const db = (await import("@/lib/supabase/admin")).createAdminClient();
    if (!db) return Response.json({ error:"not_configured" }, { status:409 });
    const { data:official, error:officialError } = await db.from("connected_accounts").select("id,url,external_account_id,connection_health,provider_status").eq("id",protectedOfficialAccountId).eq("creator_id",creator.id).eq("platform",raw).eq("account_type","official").maybeSingle();
    if (officialError) return Response.json({ error:"Temporarily unavailable" }, { status:503, headers:{"cache-control":"no-store"} });
    if (!official || !canonicalAccountConnected({ health:official.connection_health, providerStatus:official.provider_status, hasPublicUrl:Boolean(official.url), hasExternalAccountId:Boolean(official.external_account_id) })) return Response.json({ error:"invalid_official_account" }, { status:409 });
  }
  if(recoveryForMainAccountId){if(role!=="backup")return Response.json({error:"invalid_recovery_context"},{status:409});const db=(await import("@/lib/supabase/admin")).createAdminClient();if(!db)return Response.json({error:"not_configured"},{status:409});if(!await validateRecoveryMainContext(db,{creatorId:creator.id,mainAccountId:recoveryForMainAccountId}))return Response.json({error:"invalid_recovery_context"},{status:409});}
  if(recoveryNetworkId){const db=(await import("@/lib/supabase/admin")).createAdminClient();if(!db||!(role==="official"?await validateEmptyRecoveryNetwork(db,{creatorId:creator.id,recoveryNetworkId}):await validateRecoveryNetwork(db,{creatorId:creator.id,recoveryNetworkId})))return Response.json({error:"invalid_recovery_network_context"},{status:409});}
  const entitlement = await canCreateProviderConnection(creator.id, role, connectionId ? "reconnect" : "new_connection", user);
  if (!entitlement.allowed) return NextResponse.redirect(new URL(returnTo ? `/onboarding/accounts?step=${role}&oauth=${raw}:connection_limit_reached` : `/dashboard/platforms?social=${raw}:connection_limit_reached`, request.url));
  const nonce = randomBytes(24).toString("base64url");
  const pkce = adapter.pkce ? createPkce() : null;
  const state = createOAuthState({ creatorId:creator.id, userId:user.id, provider:raw, nonce, role, connectionId, ...(protectedOfficialAccountId ? {protectedOfficialAccountId} : {}), ...(recoveryForMainAccountId?{recoveryForMainAccountId}:recoveryNetworkId?{recoveryForMainAccountId:recoveryNetworkId}:{}), expiresAt:Date.now()+600000, codeChallenge:pkce?.challenge, returnTo });
  if (raw === "instagram" || raw === "tiktok") debugLog("oauth", { event:`${raw}_oauth_authorize`, step:"oauth_state_created" });
  if (raw === "snapchat") debugLog("oauth", { event:"snapchat_oauth_configuration", provider:"snapchat", pkceEnabled:adapter.pkce });
  const store = await cookies();
  store.set(`social_oauth_${raw}`, JSON.stringify({nonce,verifier:pkce?.verifier}), { httpOnly:true, secure:new URL(origin.externalOrigin).protocol === "https:", sameSite:"lax", path:`/api/integrations/${raw}/callback`, maxAge:600 });
  try {
    const authorizationUrl = (await adapter.createAuthorizationUrl({ state, codeChallenge:pkce?.challenge })).url;
    if (raw === "instagram" || raw === "tiktok") debugLog("oauth", { event:`${raw}_oauth_authorize`, step:"provider_authorization_redirect" });
    return NextResponse.redirect(authorizationUrl);
  } catch {
    return NextResponse.redirect(new URL(returnTo ? `/onboarding/accounts?step=${role}&oauth=${raw}:configuration_pending` : `/dashboard/platforms?social=${raw}:configuration_pending`, request.url));
  }
}

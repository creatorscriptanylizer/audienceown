import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { exchangeInstagramCode, fetchInstagramLoginIdentity, refreshInstagramToken, revokeInstagramToken } from "@/lib/providers/meta";
import { fetchProviderAudienceMetric } from "@/lib/platform-audience/server";
import { getSocialProvider } from "@/lib/social-providers/registry";
import { providerReadiness } from "@/lib/social-providers/readiness";
import { resolveInstagramAssetSelection } from "@/lib/social-providers/providers/instagram";
import { oauthProviderStatus, providerStatusSchema, providerStatuses } from "@/lib/social-providers/provider-status";

const original = { ...process.env };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const rawJson = (body: string, status = 200) => new Response(body, { status, headers: { "content-type": "application/json" } });

describe("Stage 13 Instagram OAuth production contract", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.assign(process.env, {
      INSTAGRAM_CLIENT_ID: "instagram-app-id",
      INSTAGRAM_CLIENT_SECRET: "instagram-app-secret",
      INSTAGRAM_REDIRECT_URI: "https://app.example/api/integrations/instagram/callback",
      INSTAGRAM_APP_REVIEW_STATUS: "approved",
      INSTAGRAM_GRAPH_API_VERSION: "v23.0",
      META_GRAPH_API_VERSION: "v24.0",
    });
  });
  afterEach(() => { process.env = { ...original }; vi.restoreAllMocks(); });

  it("keeps a healthy direct-login grant distinct from app-review-gated detection", () => {
    expect(oauthProviderStatus({provider:"instagram",detectionReady:false,reviewStatus:"required"})).toBe("app_review_required");
    expect(oauthProviderStatus({provider:"instagram",detectionReady:true,reviewStatus:"approved"})).toBe("ready");
    expect(providerStatusSchema.parse("app_review_required")).toBe("app_review_required");
    expect(providerStatusSchema.safeParse("arbitrary").success).toBe(false);
    expect(providerStatuses).toContain("asset_selection_required");
    const migration=readFileSync("supabase/migrations/20260910000000_connected_account_provider_status_contract.sql","utf8");
    for(const status of providerStatuses)expect(migration).toContain(`'${status}'`);
  });

  it("uses Instagram Login endpoints and only the current basic business scope", async () => {
    const adapter = getSocialProvider("instagram");
    const authorization = new URL((await adapter.createAuthorizationUrl!({ state: "signed-state" })).url);
    expect(authorization.origin + authorization.pathname).toBe("https://www.instagram.com/oauth/authorize");
    expect(authorization.searchParams.get("scope")).toBe("instagram_business_basic");
    expect(authorization.searchParams.get("redirect_uri")).toBe(process.env.INSTAGRAM_REDIRECT_URI);
    expect(authorization.searchParams.get("state")).toBe("signed-state");
  });

  it("exchanges and rotates long-lived tokens while retaining the stable provider id", async () => {
    const fetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json({ access_token: "short", user_id: "17841400000000000", permissions: ["instagram_business_basic"] }))
      .mockResolvedValueOnce(json({ access_token: "long", expires_in: 5_184_000 }))
      .mockResolvedValueOnce(json({ access_token: "rotated", expires_in: 5_184_000 }));
    await expect(exchangeInstagramCode("single-use-code")).resolves.toMatchObject({ accessToken: "long", refreshToken: "long", stableIdentityId: "17841400000000000" });
    await expect(refreshInstagramToken("long")).resolves.toMatchObject({ accessToken: "rotated", refreshToken: "rotated" });
    expect(fetch.mock.calls[0][0]).toBe("https://api.instagram.com/oauth/access_token");
    expect(String(fetch.mock.calls[1][0])).toContain("graph.instagram.com/access_token");
    expect(String(fetch.mock.calls[2][0])).toContain("graph.instagram.com/refresh_access_token");
  });

  it.each([
    ['{"access_token":"short","user_id":27147497038263424,"permissions":["instagram_business_basic"]}', "number"],
    ['{"access_token":"short","user_id":"27147497038263424","permissions":["instagram_business_basic"]}', "string"],
  ])("preserves a large %s token-exchange user_id exactly",async(body)=>{
    vi.spyOn(globalThis,"fetch")
      .mockResolvedValueOnce(rawJson(body))
      .mockResolvedValueOnce(json({access_token:"long",expires_in:5_184_000}));
    await expect(exchangeInstagramCode("single-use-code")).resolves.toMatchObject({stableIdentityId:"27147497038263424"});
  });

  it("reports safe numeric wire metadata without logging the id or credentials",async()=>{
    process.env.AUDIENCEOWN_DEBUG="1";
    const log=vi.spyOn(console,"info").mockImplementation(()=>undefined);
    vi.spyOn(globalThis,"fetch")
      .mockResolvedValueOnce(rawJson('{"access_token":"private-short-token","user_id":27147497038263424}'))
      .mockResolvedValueOnce(json({access_token:"private-long-token"}));
    await exchangeInstagramCode("private-code");
    const output=JSON.stringify(log.mock.calls);
    expect(output).toContain('"userIdWireType":"number"');
    expect(output).toContain('"userIdDigitLength":17');
    expect(output).toContain('"userIdExceedsSafeInteger":true');
    expect(output).not.toContain("27147497038263424");
    expect(output).not.toContain("private-short-token");
    expect(output).not.toContain("private-code");
  });

  it("continues to fail closed on a normal Meta token error response",async()=>{
    vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({error:{message:"Invalid authorization code",type:"OAuthException",code:100}},400));
    await expect(exchangeInstagramCode("expired-code")).rejects.toThrow("instagram_token_exchange_failed");
  });

  it("uses the Instagram-specific exchange through the registered adapter", async () => {
    const fetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json({ access_token: "short", user_id: "17841400000000000", permissions: ["instagram_business_basic"] }))
      .mockResolvedValueOnce(json({ access_token: "long", expires_in: 5_184_000 }));
    await expect(getSocialProvider("instagram").exchangeAuthorizationCode!({code:"single-use-code"})).resolves.toMatchObject({accessToken:"long",stableIdentityId:"17841400000000000"});
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("distinguishes zero, one, and multiple eligible Instagram assets",()=>{
    expect(resolveInstagramAssetSelection([])).toEqual({eligibleAssetCount:0,selectedAssetId:null,automaticSelection:false,assetSelectionRequired:false});
    expect(resolveInstagramAssetSelection(["ig-one"])).toEqual({eligibleAssetCount:1,selectedAssetId:"ig-one",automaticSelection:true,assetSelectionRequired:false});
    expect(resolveInstagramAssetSelection(["ig-one","ig-two"])).toEqual({eligibleAssetCount:2,selectedAssetId:null,automaticSelection:false,assetSelectionRequired:true});
  });

  it("resolves identity successfully after the authenticated asset is selected",async()=>{
    const selection=resolveInstagramAssetSelection(["17841400000000000"]);
    vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({id:selection.selectedAssetId,user_id:"89141400000000000",username:"creator"}));
    await expect(getSocialProvider("instagram").fetchIdentity!({accessToken:"token",metadata:{externalAccountId:selection.selectedAssetId}})).resolves.toMatchObject({externalAccountId:"89141400000000000",username:"creator"});
  });

  it("persists identity from the stable id rather than username authority", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json({id:"17841400000000000",user_id:"89141400000000000",username:"creator"}));
    await expect(fetchInstagramLoginIdentity("token", "17841400000000000")).resolves.toMatchObject({ externalAccountId: "89141400000000000", username: "creator", profileUrl: "https://www.instagram.com/creator/", avatarUrl: null, metadata: { loginMethod: "instagram_login", canonicalIdSource:"me.user_id" } });
  });

  it("requests only the minimum direct-login identity fields",async()=>{
    const fetch=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({id:"17841400000000000",user_id:"89141400000000000",username:"Creator.Name"}));
    await expect(fetchInstagramLoginIdentity("token","17841400000000000")).resolves.toMatchObject({externalAccountId:"89141400000000000",username:"Creator.Name",displayName:"Creator.Name",avatarUrl:null});
    const request=new URL(String(fetch.mock.calls[0][0]));
    expect(request.host).toBe("graph.instagram.com");
    expect(request.pathname).toBe("/v23.0/me");
    expect(request.searchParams.get("fields")).toBe("id,user_id,username");
    expect(String(fetch.mock.calls[0][0])).not.toContain("/17841400000000000?");
  });

  it("binds /me id to the token-exchange user_id and fails closed on mismatch",async()=>{
    vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(rawJson('{"id":27147497038263425,"user_id":"89147497038263424","username":"creator"}'));
    await expect(fetchInstagramLoginIdentity("token","27147497038263424")).rejects.toThrow("instagram_identity_mismatch");
  });

  it.each([
    ["89147497038263424"],
    ['"89147497038263424"'],
  ])("preserves large /me identifiers and selects user_id canonically",async(userId)=>{
    const body=`{"id":27147497038263424,"user_id":${userId},"username":"creator"}`;
    vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(rawJson(body));
    await expect(fetchInstagramLoginIdentity("token","27147497038263424")).resolves.toMatchObject({externalAccountId:"89147497038263424"});
  });

  it("preserves stable identity when /me omits username",async()=>{
    vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({id:"17841400000000000",user_id:"89141400000000000"}));
    await expect(fetchInstagramLoginIdentity("token","17841400000000000")).resolves.toMatchObject({externalAccountId:"89141400000000000",username:null,displayName:"Instagram account"});
  });

  it("rejects missing identities, data envelopes, and non-decimal ids",async()=>{
    const fetch=vi.spyOn(globalThis,"fetch");
    fetch.mockResolvedValueOnce(json({username:"creator"}));
    await expect(fetchInstagramLoginIdentity("token","123")).rejects.toThrow("instagram_identity_invalid_response");
    fetch.mockResolvedValueOnce(json({data:[{id:"123",user_id:"456",username:"other"}]}));
    await expect(fetchInstagramLoginIdentity("token","123")).rejects.toThrow("instagram_identity_invalid_response");
    fetch.mockResolvedValueOnce(json({id:"123",user_id:"not-a-decimal-id"}));
    await expect(fetchInstagramLoginIdentity("token","123")).rejects.toThrow("instagram_identity_invalid_response");
  });

  it("logs only the safe direct-login response shape",async()=>{
    process.env.AUDIENCEOWN_DEBUG="1";
    const log=vi.spyOn(console,"info").mockImplementation(()=>undefined);
    vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({id:"123",user_id:"456",username:"creator"}));
    await fetchInstagramLoginIdentity("private-token","123");
    const output=JSON.stringify(log.mock.calls);
    expect(output).toContain('"topLevelKeys":["id","user_id","username"]');
    expect(output).toContain('"userIdWireType":"string"');
    expect(output).not.toContain("private-token");
    expect(output).not.toContain('"user_id":"456"');
  });

  it("normalizes safe Meta Graph errors without exposing credentials",async()=>{
    process.env.AUDIENCEOWN_DEBUG="1";
    const errorLog=vi.spyOn(console,"error").mockImplementation(()=>undefined);
    vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({error:{message:"Unsupported get request",type:"GraphMethodException",code:100,error_subcode:33}},400));
    await expect(fetchInstagramLoginIdentity("private-token","17841400000000000")).rejects.toMatchObject({message:"instagram_provider_failure",httpStatus:400,providerCode:100,providerSubcode:33});
    const output=JSON.stringify(errorLog.mock.calls);
    expect(output).toContain("GraphMethodException");
    expect(output).toContain('"requestKind":"me"');
    expect(output).toContain('"requestedFields":["id","user_id","username"]');
    expect(output).not.toContain("private-token");
  });

  it("fetches direct follower counts from graph.instagram.com and linked assets from graph.facebook.com", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async () => json({ followers_count: 321 }));
    await expect(fetchProviderAudienceMetric({ provider: "instagram", accessToken: "direct", stableId: "1784", loginMethod: "instagram_login" })).resolves.toMatchObject({ count: 321, status: "available" });
    expect(String(fetch.mock.calls[0][0])).toContain("https://graph.instagram.com/v23.0/1784?fields=followers_count");
    await fetchProviderAudienceMetric({ provider: "instagram", accessToken: "page", stableId: "1784", loginMethod: "facebook_login" });
    expect(String(fetch.mock.calls[1][0])).toContain("https://graph.facebook.com/v24.0/1784?fields=followers_count");
  });

  it("revokes the exact Instagram grant", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json({ success: true }));
    await revokeInstagramToken("decrypted-token");
    expect(String(fetch.mock.calls[0][0])).toContain("graph.instagram.com/me/permissions");
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: "DELETE" });
  });

  it("does not treat Facebook credentials as direct Instagram readiness", () => {
    delete process.env.INSTAGRAM_CLIENT_ID; delete process.env.INSTAGRAM_CLIENT_SECRET; delete process.env.INSTAGRAM_REDIRECT_URI;
    Object.assign(process.env, { META_APP_ID: "meta", META_APP_SECRET: "secret", META_REDIRECT_URI: "https://app.example/api/integrations/meta/callback" });
    expect(providerReadiness(getSocialProvider("instagram"))).toMatchObject({ configured: false, connectionAvailable: false, missingConfiguration: ["INSTAGRAM_CLIENT_ID", "INSTAGRAM_CLIENT_SECRET", "INSTAGRAM_REDIRECT_URI"] });
  });

  it("keeps role, origin, replay, encryption, duplicate, and reconnect checks in shared routes", () => {
    const connect = readFileSync("app/api/integrations/[provider]/connect/route.ts", "utf8");
    const callback = readFileSync("app/api/integrations/[provider]/callback/route.ts", "utf8");
    expect(connect.replace(/\s+/g,"")).toContain("createOAuthState({creatorId:creator.id,userId:user.id,provider:raw,nonce,role,connectionId");
    expect(connect).toContain("returnTo");
    expect(callback).toContain("store.delete(`social_oauth_${raw}`)");
    expect(callback).toContain('uniqueAcrossRoles=raw==="instagram"');
    expect(callback).toContain("reconnect_mismatch");
    expect(callback).toContain("encryptSocialSecret(tokens.accessToken)");
    expect(callback).toContain("oauthDestination(request,state,raw,\"already_connected\")");
    expect(callback).toContain('.eq("external_account_id",persistedIdentity.externalAccountId)');
    expect(callback).toContain("target.external_account_id!==identity.externalAccountId");
    expect(callback).toContain('event:"connection_persistence"');
    expect(callback).toContain('event:"credential_persistence"');
  });
});

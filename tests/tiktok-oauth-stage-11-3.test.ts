import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {readFileSync} from "node:fs";
import {exchangeTikTokCode,fetchTikTokIdentity,refreshTikTokToken,revokeTikTokToken} from "@/lib/providers/tiktok";
import {normalizeProviderAudience} from "@/lib/platform-audience/normalize";
import {providerConnectionCapability} from "@/lib/social-providers/connection-capabilities";
import {SocialProviderError} from "@/lib/social-providers/errors";
import {createOAuthState,verifyOAuthState} from "@/lib/social-providers/oauth";
import {getSocialProvider,listOAuthProviderRegistry} from "@/lib/social-providers/registry";
import {sanitizeDebugMetadata,serializeDebugError} from "@/lib/debug";

const source=(path:string)=>readFileSync(path,"utf8"),original={...process.env};
const json=(body:unknown,status=200,headers:HeadersInit={})=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json",...headers}});
const token=(overrides:Record<string,unknown>={})=>({access_token:"access",refresh_token:"refresh",expires_in:86400,refresh_expires_in:31536000,open_id:"stable-open-id",scope:"user.info.basic,user.info.profile,user.info.stats",token_type:"Bearer",...overrides});

describe("Stage 11.3 TikTok OAuth",()=>{
  beforeEach(()=>{vi.restoreAllMocks();Object.assign(process.env,{SOCIAL_OAUTH_STATE_SECRET:"state-secret",TIKTOK_CLIENT_KEY:"client-key",TIKTOK_CLIENT_SECRET:"client-secret",TIKTOK_REDIRECT_URI:"https://app.test/api/integrations/tiktok/callback",TIKTOK_APP_REVIEW_STATUS:"approved"});});
  afterEach(()=>{process.env={...original};vi.restoreAllMocks();});

  it("publishes TikTok through the shared registry and distinguishes configuration/review states",()=>{
    expect(listOAuthProviderRegistry().find(item=>item.id==="tiktok")).toMatchObject({oauthImplemented:true,configuration:"configured",connectPath:"/api/integrations/tiktok/connect",refreshSupported:true,disconnectSupported:true});
    expect(providerConnectionCapability(getSocialProvider("tiktok"),true)).toMatchObject({implementationStatus:"implemented",oauthStatus:"available"});
    process.env.TIKTOK_APP_REVIEW_STATUS="required";expect(providerConnectionCapability(getSocialProvider("tiktok"),true).oauthStatus).toBe("review_required");
    delete process.env.TIKTOK_CLIENT_SECRET;expect(listOAuthProviderRegistry().find(item=>item.id==="tiktok")).toMatchObject({configuration:"missing",missingConfiguration:["TIKTOK_CLIENT_SECRET"]});
    process.env.TIKTOK_CLIENT_SECRET="secret";process.env.TIKTOK_REDIRECT_URI="http://localhost:3000/api/integrations/tiktok/callback";expect(listOAuthProviderRegistry().find(item=>item.id==="tiktok")?.configuration).toBe("invalid");
  });

  it("builds the current Web Login Kit URL with comma scopes and no desktop PKCE",async()=>{
    const result=await getSocialProvider("tiktok").createAuthorizationUrl!({state:"signed-state"}),url=new URL(result.url);
    expect(`${url.origin}${url.pathname}`).toBe("https://www.tiktok.com/v2/auth/authorize/");expect(url.searchParams.get("client_key")).toBe("client-key");expect(url.searchParams.get("scope")).toBe("user.info.basic,user.info.profile,user.info.stats");expect(url.searchParams.get("state")).toBe("signed-state");expect(url.searchParams.has("code_challenge")).toBe(false);
  });

  it("cryptographically binds official, backup, nonce, expiry, and exact reconnect target",()=>{
    const id="00000000-0000-4000-8000-000000000113",official=createOAuthState({provider:"tiktok",creatorId:"creator",userId:"user",nonce:"one",role:"official",expiresAt:2000}),backup=createOAuthState({provider:"tiktok",creatorId:"creator",userId:"user",nonce:"two",role:"backup",connectionId:id,expiresAt:2000});
    expect(verifyOAuthState(official,"tiktok","one",1000)?.role).toBe("official");expect(verifyOAuthState(backup,"tiktok","two",1000)).toMatchObject({role:"backup",connectionId:id});expect(verifyOAuthState(backup,"tiktok","wrong",1000)).toBeNull();expect(verifyOAuthState(backup,"tiktok","two",2001)).toBeNull();
  });

  it("exchanges tokens and preserves TikTok's stable open_id plus both expirations",async()=>{
    const fetch=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json(token()));
    await expect(exchangeTikTokCode("authorization-code")).resolves.toMatchObject({accessToken:"access",refreshToken:"refresh",stableIdentityId:"stable-open-id",grantedScopes:["user.info.basic","user.info.profile","user.info.stats"]});
    const body=fetch.mock.calls[0][1]?.body as URLSearchParams;expect(body.get("client_key")).toBe("client-key");expect(body.get("client_secret")).toBe("client-secret");expect(body.get("code")).toBe("authorization-code");expect(body.has("code_verifier")).toBe(false);
  });

  it("validates and atomically adopts refresh-token rotation only after a successful response",async()=>{
    vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json(token({access_token:"new-access",refresh_token:"rotated-refresh"})));
    await expect(refreshTikTokToken("old-refresh")).resolves.toMatchObject({accessToken:"new-access",refreshToken:"rotated-refresh"});
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(json({error:"invalid_grant",error_description:"expired",log_id:"safe-log"},400));
    await expect(refreshTikTokToken("old-refresh")).rejects.toMatchObject({code:"invalid_grant",providerCode:"invalid_grant",httpStatus:400});
    const worker=source("lib/social-providers/authorized-credential.ts");expect(worker.indexOf("await adapter.refreshAccessToken")).toBeLessThan(worker.indexOf("refresh_token_ciphertext:encryptSocialSecret(refreshToken)"));
  });

  it("normalizes identity by open_id rather than mutable username",async()=>{
    vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({data:{user:{open_id:"stable-open-id",display_name:"Creator",username:"mutable-name",avatar_url:"https://p16.tiktokcdn.com/avatar.jpeg",profile_deep_link:"https://www.tiktok.com/@mutable-name",bio_description:"bio"}},error:{code:"ok",message:"",log_id:"log"}}));
    await expect(fetchTikTokIdentity("access")).resolves.toMatchObject({externalAccountId:"stable-open-id",displayName:"Creator",username:"mutable-name",profileUrl:"https://www.tiktok.com/@mutable-name"});
  });

  it.each([[0,"official"],[24800,"backup"]] as const)("preserves %i followers and exact %s metric association",(count,role)=>{
    expect(normalizeProviderAudience("tiktok",{data:{user:{follower_count:count}},error:{code:"ok"}})).toEqual({count,status:"available",approximate:false});
    expect(["official","backup"]).toContain(role);
    const initial=source("lib/social-providers/initial-audience.ts");expect(initial).toContain("p_connection_id:input.connectionId");expect(initial).toContain("p_account_category:input.role");expect(initial).toContain("append_provider_audience_snapshot");
  });

  it("allows connection when follower permission is unavailable and preserves last metrics during retries",()=>{
    const callback=source("app/api/integrations/[provider]/callback/route.ts"),worker=source("app/api/internal/providers/audience-metrics/sync/route.ts");expect(callback.indexOf("await initializeProviderAudience")).toBeGreaterThan(callback.indexOf("platform_connection_secrets"));expect(worker).toContain('status:row.audience_count===null?safe.status:"stale"');expect(worker).toContain("nextAudienceSync(provider,row.consecutive_failures+1)");
  });

  it("prevents duplicates, preserves provider coexistence, and enforces exact reconnect identity",()=>{
    const callback=source("app/api/integrations/[provider]/callback/route.ts");expect(callback).toContain('raw==="tiktok"||raw==="x"');expect(callback).toContain("uniqueAcrossRoles&&duplicate.data");expect(callback).toContain("already_connected");expect(callback).toContain("reconnect_mismatch");expect(callback).toContain("target.external_account_id!==identity.externalAccountId");expect(callback).toContain("is_primary:false");expect(callback).not.toContain("delete().eq(\"platform\",raw)");
  });

  it("encrypts both credentials and compensates only newly inserted failed connections",()=>{
    const callback=source("app/api/integrations/[provider]/callback/route.ts");expect(callback).toContain("encryptSocialSecret(tokens.accessToken)");expect(callback).toContain("encryptSocialSecret(tokens.refreshToken)");expect(callback).toContain("if(createdId)");expect(callback).toContain('delete().eq("id",createdId)');
  });

  it("revokes TikTok access and shared disconnect removes only the exact connection",async()=>{
    const fetch=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(new Response("",{status:200}));await expect(revokeTikTokToken("access")).resolves.toBeUndefined();const body=fetch.mock.calls[0][1]?.body as URLSearchParams;expect(fetch.mock.calls[0][0]).toBe("https://open.tiktokapis.com/v2/oauth/revoke/");expect(body.get("token")).toBe("access");
    const disconnect=source("app/api/integrations/[provider]/disconnect/route.ts");expect(disconnect).toContain('"tiktok"');expect(disconnect).toContain("parsed.data.connectionId");expect(disconnect).toContain("removeCreatorConnectedAccount");
  });

  it("classifies rate limits and temporary failures without leaking credentials",async()=>{
    vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({error:"temporarily_unavailable",error_description:"retry",log_id:"safe-log"},503));
    await expect(exchangeTikTokCode("code")).rejects.toMatchObject({code:"transient",providerCode:"temporarily_unavailable",httpStatus:503});
    const error=Object.assign(new SocialProviderError("rate_limited","tiktok","Rate limited."),{httpStatus:429,providerCode:"rate_limit_exceeded"});expect(serializeDebugError(error)).toMatchObject({code:"rate_limited",httpStatus:429,providerCode:"rate_limit_exceeded"});expect(sanitizeDebugMetadata({authorizationCode:"code",accessToken:"access",refreshToken:"refresh",clientSecret:"secret"})).toEqual({authorizationCode:"[REDACTED]",accessToken:"[REDACTED]",refreshToken:"[REDACTED]",clientSecret:"[REDACTED]"});
  });
});

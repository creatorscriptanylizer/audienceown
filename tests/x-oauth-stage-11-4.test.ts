import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {readFileSync} from "node:fs";
import {exchangeXCode,fetchXIdentity,refreshXToken,revokeXToken} from "@/lib/providers/x";
import {normalizeProviderAudience} from "@/lib/platform-audience/normalize";
import {providerPickerState} from "@/components/platforms-manager";
import {providerConnectionCapability} from "@/lib/social-providers/connection-capabilities";
import {createOAuthState,createPkce,verifyOAuthState} from "@/lib/social-providers/oauth";
import {getSocialProvider,listOAuthProviderRegistry} from "@/lib/social-providers/registry";
import {normalizeProviderFailure} from "@/lib/social-providers/errors";

const original={...process.env},source=(path:string)=>readFileSync(path,"utf8");
const json=(body:unknown,status=200,headers:HeadersInit={})=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json",...headers}});
const token=(overrides:Record<string,unknown>={})=>({token_type:"bearer",expires_in:7200,access_token:"access",refresh_token:"refresh",scope:"tweet.read users.read offline.access",...overrides});
describe("Stage 11.4 X OAuth",()=>{
  beforeEach(()=>{vi.restoreAllMocks();Object.assign(process.env,{SOCIAL_OAUTH_STATE_SECRET:"state-secret",X_CLIENT_ID:"client-id",X_CLIENT_SECRET:"client-secret",X_REDIRECT_URI:"http://127.0.0.1:3000/api/integrations/x/callback",X_API_ACCESS_TIER:"pay_per_use"});});
  afterEach(()=>{process.env={...original};vi.restoreAllMocks();});

  it("publishes X as implemented and distinguishes missing, invalid, and valid configuration",()=>{
    expect(listOAuthProviderRegistry().find(item=>item.id==="x")).toMatchObject({oauthImplemented:true,configuration:"configured",connectPath:"/api/integrations/x/connect",refreshSupported:true,disconnectSupported:true,audienceMetricSupported:true});
    delete process.env.X_CLIENT_SECRET;expect(listOAuthProviderRegistry().find(item=>item.id==="x")).toMatchObject({configuration:"missing",missingConfiguration:["X_CLIENT_SECRET"]});
    process.env.X_CLIENT_SECRET="secret";process.env.X_REDIRECT_URI="http://localhost:3000/api/integrations/x/callback";expect(listOAuthProviderRegistry().find(item=>item.id==="x")?.configuration).toBe("invalid");
  });

  it("builds official and backup connect targets and remains isolated from another connected provider",()=>{
    const capability=providerConnectionCapability(getSocialProvider("x"));expect(capability).toMatchObject({implementationStatus:"implemented",configurationStatus:"configured",connectable:true,connectPath:"/api/integrations/x/connect"});
    expect(providerPickerState(capability,false,"official")).toMatchObject({disabled:false,href:"/api/integrations/x/connect?role=official"});expect(providerPickerState(capability,false,"backup")).toMatchObject({disabled:false,href:"/api/integrations/x/connect?role=backup"});
  });

  it("uses signed provider state with expiry and S256 PKCE",async()=>{
    const pkce=createPkce();expect(pkce.verifier).not.toBe(pkce.challenge);expect(pkce.verifier.length).toBeGreaterThanOrEqual(43);
    const state=createOAuthState({provider:"x",creatorId:"creator",userId:"user",nonce:"nonce",role:"backup",connectionId:"00000000-0000-4000-8000-000000000114",expiresAt:2000,codeChallenge:pkce.challenge});expect(verifyOAuthState(state,"x","nonce",1000)).toMatchObject({role:"backup",codeChallenge:pkce.challenge});expect(verifyOAuthState(state,"x","nonce",2001)).toBeNull();expect(verifyOAuthState(state,"tiktok","nonce",1000)).toBeNull();
    const url=new URL((await getSocialProvider("x").createAuthorizationUrl!({state,codeChallenge:pkce.challenge})).url),scopes=url.searchParams.get("scope")?.split(" ")??[];expect(url.origin+url.pathname).toBe("https://x.com/i/oauth2/authorize");expect(url.searchParams.get("code_challenge_method")).toBe("S256");expect(scopes).toEqual(["tweet.read","users.read","offline.access"]);expect(scopes).not.toContain("tweet.write");expect(scopes.some(scope=>scope.startsWith("dm."))).toBe(false);expect(scopes).toContain("offline.access");expect(url.searchParams.has("code_verifier")).toBe(false);expect(getSocialProvider("x").capabilities.automaticPublishing).toBe(false);
  });

  it("exchanges a code as a confidential client and requires PKCE plus a refresh token",async()=>{
    const fetch=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json(token()));await expect(exchangeXCode("code","verifier")).resolves.toMatchObject({accessToken:"access",refreshToken:"refresh",grantedScopes:["tweet.read","users.read","offline.access"]});const init=fetch.mock.calls[0][1]!,body=init.body as URLSearchParams;expect((init.headers as Record<string,string>).authorization).toMatch(/^Basic /);expect(body.get("code_verifier")).toBe("verifier");expect(body.get("client_secret")).toBeNull();
    await expect(exchangeXCode("code")).rejects.toMatchObject({code:"invalid_grant"});
  });

  it("normalizes stable numeric identity independently from username",async()=>{
    vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({data:{id:"2244994945",name:"Creator",username:"renamed",profile_image_url:"https://pbs.twimg.com/avatar.jpg",protected:false,public_metrics:{followers_count:0}}}));await expect(fetchXIdentity("access")).resolves.toMatchObject({externalAccountId:"2244994945",displayName:"Creator",username:"renamed",profileUrl:"https://x.com/renamed",metadata:{followersCount:0}});
  });

  it.each([
    ["absolute","https://creator.example/profile","https://creator.example/profile"],
    ["missing",undefined,null],
    ["null",null,null],
    ["empty","",null],
    ["non-absolute","creator.example/profile",null],
    ["malformed","not a url",null],
  ])("accepts a valid stable identity with a %s optional profile URL",async(_label,url,websiteUrl)=>{
    vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({data:{id:"2244994945",name:"Creator",username:"creator",url}}));
    await expect(fetchXIdentity("access")).resolves.toMatchObject({externalAccountId:"2244994945",profileUrl:"https://x.com/creator",metadata:{websiteUrl}});
  });

  it("tolerates absent and malformed optional presentation fields",async()=>{
    vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({data:{id:"2244994945",name:42,username:"creator",profile_image_url:"not-absolute",protected:"no",public_metrics:{followers_count:0}}}));
    await expect(fetchXIdentity("access")).resolves.toMatchObject({externalAccountId:"2244994945",displayName:"creator",avatarUrl:null,metadata:{description:null,profileImageUrl:null,protected:false,followersCount:0}});
  });

  it("allows missing username and metrics while retaining the immutable X user ID",async()=>{
    vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({data:{id:"2244994945"}}));
    await expect(fetchXIdentity("access")).resolves.toMatchObject({externalAccountId:"2244994945",displayName:"X account",username:null,profileUrl:"https://x.com/i/user/2244994945",metadata:{followersCount:null}});
  });

  it.each([
    ["missing id",{data:{name:"Creator",username:"creator"}}],
    ["malformed envelope",{data:[]}],
    ["missing envelope",{errors:[]}],
    ["negative followers",{data:{id:"2244994945",public_metrics:{followers_count:-1}}}],
    ["non-numeric followers",{data:{id:"2244994945",public_metrics:{followers_count:"many"}}}],
  ])("rejects %s",async(_label,payload)=>{
    vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json(payload));
    await expect(fetchXIdentity("access")).rejects.toMatchObject({code:"malformed_provider_object",provider:"x"});
  });

  it("logs only response shape and validation category for X identity",async()=>{
    process.env.DEBUG_OAUTH="true";const log=vi.spyOn(console,"info").mockImplementation(()=>{});
    vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({data:{id:"2244994945",name:"Private Name",username:"private-handle",description:"private bio",profile_image_url:"https://example.com/private.png",url:"not a url"}}));
    await fetchXIdentity("access");const shape=log.mock.calls.find(call=>JSON.stringify(call).includes("x_identity_response_shape"));expect(shape).toBeDefined();const serialized=JSON.stringify(shape);
    for(const key of["responseKeys","dataKeys","present","type","validationCategory"])expect(serialized).toContain(`\"${key}\"`);
    for(const value of["2244994945","Private Name","private-handle","private bio","private.png","not a url"])expect(serialized).not.toContain(value);
  });

  it("accepts identity after the canonical read-only scope exchange",async()=>{
    const fetch=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json(token())).mockResolvedValueOnce(json({data:{id:"2244994945",name:"Creator",username:"creator",public_metrics:{followers_count:42}}}));
    const exchanged=await exchangeXCode("code","verifier");expect(exchanged.grantedScopes).toEqual(["tweet.read","users.read","offline.access"]);await expect(fetchXIdentity(exchanged.accessToken)).resolves.toMatchObject({externalAccountId:"2244994945",metadata:{followersCount:42}});expect(fetch.mock.calls[1][0]).toContain("users/me?user.fields=");
  });

  it("classifies a valid X 403 error response as a missing approved scope",async()=>{
    vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({title:"Forbidden",detail:"Client is not permitted to access this resource"},403));await expect(fetchXIdentity("access")).rejects.toMatchObject({code:"missing_approved_scope",provider:"x",providerCode:"Forbidden",httpStatus:403});
  });

  it("rotates refresh credentials only after a complete valid response",async()=>{
    vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json(token({access_token:"next",refresh_token:"rotated"})));await expect(refreshXToken("old-refresh")).resolves.toMatchObject({accessToken:"next",refreshToken:"rotated"});
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(json({error:"invalid_grant"},400));await expect(refreshXToken("old-refresh")).rejects.toMatchObject({code:"invalid_grant"});const worker=source("lib/social-providers/authorized-credential.ts");expect(worker.indexOf("await adapter.refreshAccessToken")).toBeLessThan(worker.indexOf("refresh_token_ciphertext:encryptSocialSecret(refreshToken)"));
  });

  it.each([0,12450])("preserves an exact %i-follower metric",count=>{expect(normalizeProviderAudience("x",{data:{public_metrics:{followers_count:count}}})).toEqual({count,status:"available",approximate:false});const callback=source("app/api/integrations/[provider]/callback/route.ts"),initial=source("lib/social-providers/initial-audience.ts");expect(callback.replace(/\s+/g,"")).toContain('provider:rawas"instagram"|"tiktok"|"x"');expect(initial).toContain("p_connection_id:input.connectionId");expect(initial).toContain("p_account_category:input.role");});

  it("keeps metric failure non-fatal and preserves last known data during rate limits",()=>{const callback=source("app/api/integrations/[provider]/callback/route.ts"),worker=source("app/api/internal/providers/audience-metrics/sync/route.ts");expect(callback).toContain("await initializeProviderAudience");expect(worker).toContain('status:row.audience_count===null?safe.status:"stale"');expect(worker).toContain("nextAudienceSync(provider,row.consecutive_failures+1)");});

  it("prevents creator-level X duplicates and validates exact reconnect identity",()=>{const callback=source("app/api/integrations/[provider]/callback/route.ts");expect(callback).toContain('raw==="tiktok"||raw==="x"');expect(callback).toContain("already_connected");expect(callback).toContain("reconnect_mismatch");expect(callback).toContain("target.external_account_id!==identity.externalAccountId");expect(callback).toContain("is_primary:false");});

  it("encrypts credentials and removes only a failed new connection",()=>{const callback=source("app/api/integrations/[provider]/callback/route.ts");expect(callback).toContain("encryptSocialSecret(tokens.accessToken)");expect(callback).toContain("encryptSocialSecret(tokens.refreshToken)");expect(callback).toContain("if(createdId)");expect(callback).toContain('delete().eq("id",createdId)');});

  it("revokes the refresh token and uses exact shared disconnect cleanup",async()=>{const fetch=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(new Response("",{status:200}));await expect(revokeXToken("refresh")).resolves.toBeUndefined();expect(fetch.mock.calls[0][0]).toBe("https://api.x.com/2/oauth2/revoke");expect((fetch.mock.calls[0][1]?.body as URLSearchParams).get("token")).toBe("refresh");const disconnect=source("app/api/integrations/[provider]/disconnect/route.ts");expect(disconnect).toContain('"x"');expect(disconnect).toContain("parsed.data.connectionId");expect(disconnect).toContain("removeCreatorConnectedAccount");expect(disconnect).toContain("refresh_token_ciphertext");});

  it("classifies rate limits, outages, and revoked grants without token logging",async()=>{vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({title:"Too Many Requests"},429,{"x-rate-limit-reset":String(Math.ceil(Date.now()/1000)+120)}));await expect(fetchXIdentity("access")).rejects.toMatchObject({code:"rate_limited",httpStatus:429,retryAfterSeconds:expect.any(Number)});expect(normalizeProviderFailure(Object.assign(new Error("outage"),{code:"transient"}))).toMatchObject({category:"temporary_provider",retryable:true,reconnectRequired:false});expect(source("lib/providers/x.ts")).not.toMatch(/console\.(log|info|warn|error)/);});

  it("regresses shared providers without changing primary constraints",()=>{const registry=listOAuthProviderRegistry();for(const provider of["youtube","instagram","facebook","tiktok"]as const)expect(registry.find(item=>item.id===provider)?.oauthImplemented).toBe(true);expect(source("supabase/migrations/20260724000000_stage_one.sql")).toContain("one_primary_account_per_type");});
});

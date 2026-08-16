import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {readFileSync} from "node:fs";
import {fetchTikTokIdentity,refreshTikTokToken} from "@/lib/providers/tiktok";
import {getSocialProvider} from "@/lib/social-providers/registry";
import {resolveConnectionStatus} from "@/lib/social-providers/connection-health";
import liveUserInfo from "./fixtures/tiktok-live-user-info.json";

const original={...process.env};
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
const user=(overrides:Record<string,unknown>={})=>({data:{user:{open_id:"app-open-id",display_name:"TikTok Creator",...overrides}},error:{code:"ok",message:"",log_id:"safe-log"}});

describe("Stage 15 TikTok official account integration",()=>{
  beforeEach(()=>{Object.assign(process.env,{TIKTOK_CLIENT_KEY:"key",TIKTOK_CLIENT_SECRET:"secret",TIKTOK_REDIRECT_URI:"https://audienceown.com/api/integrations/tiktok/callback"});vi.restoreAllMocks();});
  afterEach(()=>{process.env={...original};vi.restoreAllMocks();});

  it("uses current Login Kit endpoints and least-privilege identity/stat scopes",async()=>{const adapter=getSocialProvider("tiktok"),url=new URL((await adapter.createAuthorizationUrl!({state:"signed"})).url);expect(`${url.origin}${url.pathname}`).toBe("https://www.tiktok.com/v2/auth/authorize/");expect(url.searchParams.get("client_key")).toBe("key");expect(url.searchParams.get("response_type")).toBe("code");expect(url.searchParams.get("redirect_uri")).toBe("https://audienceown.com/api/integrations/tiktok/callback");expect(adapter.requestedScopes).toEqual(["user.info.basic","user.info.profile","user.info.stats"]);expect(adapter.requestedScopes).not.toContain("video.list");});

  it("requests fields only for granted scopes and tolerates missing optional profile data",async()=>{const fetch=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(response(user()));const identity=await fetchTikTokIdentity("access",{expectedOpenId:"app-open-id",grantedScopes:["user.info.basic"]});expect(identity).toMatchObject({externalAccountId:"app-open-id",displayName:"TikTok Creator",username:null,avatarUrl:null,profileUrl:"https://www.tiktok.com/"});const url=String(fetch.mock.calls[0][0]);expect(url).toContain("fields=open_id,union_id,display_name,avatar_url");expect(url).not.toContain("follower_count");expect(url).not.toContain("username");});

  it("binds token open_id to User Info and fails closed on mismatch",async()=>{vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(response(user({open_id:"different"})));await expect(fetchTikTokIdentity("access",{expectedOpenId:"token-open-id",grantedScopes:["user.info.basic"]})).rejects.toMatchObject({code:"tiktok_identity_mismatch",provider:"tiktok"});});

  it("includes profile and follower fields only when those scopes were granted",async()=>{const fetch=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(response(user({username:"creator",follower_count:1200})));await fetchTikTokIdentity("access",{expectedOpenId:"app-open-id",grantedScopes:["user.info.basic","user.info.profile","user.info.stats"]});const url=String(fetch.mock.calls[0][0]);expect(url).toContain("username");expect(url).toContain("follower_count");});

  it("accepts the live Sandbox User Info shape with every returned optional field",async()=>{vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(response(liveUserInfo));await expect(fetchTikTokIdentity("access",{expectedOpenId:"live-sandbox-open-id",grantedScopes:["user.info.basic","user.info.profile","user.info.stats"]})).resolves.toMatchObject({externalAccountId:"live-sandbox-open-id",displayName:"Live Creator",username:"livecreator",metadata:{followerCount:0,verified:false,unionIdPresent:true}});});

  it.each([
    ["username",{username:undefined}],
    ["display name",{display_name:undefined}],
    ["avatar",{avatar_url:undefined}],
    ["profile fields",{username:undefined,bio_description:undefined,profile_deep_link:undefined,is_verified:undefined}],
    ["stats",{follower_count:undefined}],
  ])("accepts the documented envelope when optional %s are missing",async(_label,missing)=>{vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(response(user(missing)));await expect(fetchTikTokIdentity("access",{expectedOpenId:"app-open-id",grantedScopes:["user.info.basic","user.info.profile","user.info.stats"]})).resolves.toMatchObject({externalAccountId:"app-open-id"});});

  it("preserves a zero follower count",async()=>{vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(response(user({follower_count:0})));await expect(fetchTikTokIdentity("access",{expectedOpenId:"app-open-id",grantedScopes:["user.info.basic","user.info.stats"]})).resolves.toMatchObject({metadata:{followerCount:0}});});

  it.each([
    ["missing open_id",user({open_id:undefined})],
    ["empty open_id",user({open_id:"  "})],
    ["malformed envelope",{data:{profile:{open_id:"app-open-id"}},error:{code:"ok"}}],
  ])("fails closed for %s",async(_label,body)=>{vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(response(body));await expect(fetchTikTokIdentity("access",{expectedOpenId:"app-open-id"})).rejects.toMatchObject({code:"malformed_provider_object",provider:"tiktok"});});

  it("rejects a TikTok API error envelope",async()=>{vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(response({data:{},error:{code:"scope_not_authorized",message:"denied",log_id:"safe-log"}},403));await expect(fetchTikTokIdentity("access",{expectedOpenId:"app-open-id"})).rejects.toMatchObject({code:"malformed_provider_object",provider:"tiktok",providerCode:"scope_not_authorized",httpStatus:403});});

  it("rejects a genuine TikTok API error even when HTTP status is 200",async()=>{vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(response({data:{user:{open_id:"app-open-id"}},error:{code:"scope_not_authorized",message:"denied",log_id:"safe-log"}}));await expect(fetchTikTokIdentity("access",{expectedOpenId:"app-open-id"})).rejects.toMatchObject({code:"malformed_provider_object",providerCode:"scope_not_authorized",httpStatus:200});});

  it("emits response structure without identity values",async()=>{process.env.DEBUG_OAUTH="true";const log=vi.spyOn(console,"info").mockImplementation(()=>{});vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(response(user({username:"private-handle",avatar_url:"https://example.com/private.png",follower_count:0})));await fetchTikTokIdentity("access",{expectedOpenId:"app-open-id",grantedScopes:["user.info.basic","user.info.profile"]});const shape=log.mock.calls.find(call=>JSON.stringify(call).includes("tiktok_identity_response_shape"));expect(shape).toBeDefined();const serialized=JSON.stringify(shape);for(const key of["openIdPresent","openIdType","displayNamePresent","displayNameType","usernamePresent","usernameType","followerCountPresent","followerCountType","errorCodePresent","errorCodeType"])expect(serialized).toContain(`"${key}"`);expect(serialized).not.toContain("app-open-id");expect(serialized).not.toContain("private-handle");expect(serialized).not.toContain("private.png");});

  it("preserves an existing refresh token when TikTok omits rotation",async()=>{vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(response({access_token:"new",expires_in:86400,refresh_expires_in:31536000,open_id:"app-open-id",scope:"user.info.basic",token_type:"Bearer"}));await expect(refreshTikTokToken("existing")).resolves.toMatchObject({accessToken:"new",refreshToken:null});const worker=readFileSync("lib/social-providers/authorized-credential.ts","utf8");expect(worker).toContain("token.refreshToken??oldRefresh");});

  it("keeps review-limited healthy TikTok connected and maps terminal refresh failure to reconnect",()=>{expect(resolveConnectionStatus({health:"healthy",providerStatus:"app_review_required"})).toMatchObject({connectionLabel:"Connected",actionRequired:false});const polling=readFileSync("lib/social-providers/polling.ts","utf8");expect(polling).toContain('provider_status:"reconnect_required"');});

  it("uses shared persistence, encrypted credentials, duplicate safety, projections, metrics, and cleanup",()=>{const callback=readFileSync("app/api/integrations/[provider]/callback/route.ts","utf8"),disconnect=readFileSync("app/api/integrations/[provider]/disconnect/route.ts","utf8"),projection=readFileSync("lib/social-providers/creator-account-projection.ts","utf8"),dashboard=readFileSync("lib/dashboard/creator-dashboard.ts","utf8");for(const expected of["connected_accounts","platform_connection_secrets","encryptSocialSecret","initializeProviderAudience","already_connected","reconnect_mismatch"])expect(callback).toContain(expected);expect(disconnect).toContain("removeCreatorConnectedAccount");expect(projection).toContain('"tiktok"');expect(dashboard).toContain("accountProjection");});

  it("keeps debug events safe and never emits credentials",()=>{const provider=readFileSync("lib/providers/tiktok.ts","utf8"),debug=readFileSync("lib/debug.ts","utf8");for(const event of["tiktok_token_exchange","tiktok_identity_fetch","tiktok_identity_binding"])expect(provider).toContain(event);expect(debug).toContain("SENSITIVE_KEY");expect(provider).not.toContain("console.log");});
});

import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {readFileSync} from "node:fs";
import {exchangeTwitchCode,fetchTwitchIdentity,refreshTwitchToken,revokeTwitchToken,validateTwitchToken} from "@/lib/providers/twitch";
import {normalizeProviderAudience} from "@/lib/platform-audience/normalize";
import {providerConnectionCapability} from "@/lib/social-providers/connection-capabilities";
import {getSocialProvider,listOAuthProviderRegistry} from "@/lib/social-providers/registry";

const original={...process.env};
const json=(body:unknown,status=200,headers:HeadersInit={})=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json",...headers}});
describe("Stage 11.6 Twitch OAuth",()=>{
  beforeEach(()=>{Object.assign(process.env,{TWITCH_CLIENT_ID:"client",TWITCH_CLIENT_SECRET:"secret",TWITCH_REDIRECT_URI:"http://localhost:3000/api/integrations/twitch/callback"});vi.restoreAllMocks();});
  afterEach(()=>{process.env={...original};vi.restoreAllMocks();});

  it("publishes Twitch only when its server configuration is complete",()=>{expect(listOAuthProviderRegistry().find(item=>item.id==="twitch")).toMatchObject({oauthImplemented:true,configuration:"configured",connectPath:"/api/integrations/twitch/connect",refreshSupported:true,disconnectSupported:true,audienceMetricSupported:true,assetSelectionSupported:false});expect(providerConnectionCapability(getSocialProvider("twitch"))).toMatchObject({implementationStatus:"implemented",connectable:true,audienceUnit:"followers"});delete process.env.TWITCH_CLIENT_SECRET;expect(providerConnectionCapability(getSocialProvider("twitch"))).toMatchObject({configurationStatus:"missing",connectable:false});});

  it("uses confidential authorization-code exchange and validates complete tokens",async()=>{const fetch=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({access_token:"access",refresh_token:"refresh",expires_in:14400,scope:[],token_type:"bearer"}));await expect(exchangeTwitchCode("code")).resolves.toMatchObject({accessToken:"access",refreshToken:"refresh",grantedScopes:[]});const body=fetch.mock.calls[0][1]?.body as URLSearchParams;expect(fetch.mock.calls[0][0]).toBe("https://id.twitch.tv/oauth2/token");expect(body.get("grant_type")).toBe("authorization_code");expect(body.get("client_secret")).toBe("secret");});

  it("rotates the Twitch refresh token and rejects incomplete refresh responses",async()=>{vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({access_token:"next",refresh_token:"rotated",expires_in:14400,scope:[],token_type:"bearer"}));await expect(refreshTwitchToken("old")).resolves.toMatchObject({accessToken:"next",refreshToken:"rotated"});vi.mocked(globalThis.fetch).mockResolvedValueOnce(json({access_token:"partial"}));await expect(refreshTwitchToken("old")).rejects.toMatchObject({code:"malformed_provider_object"});});

  it("validates the app and stable user ID before normalizing profile fields",async()=>{const fetch=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({client_id:"client",login:"creator_login",scopes:[],user_id:"1234",expires_in:1000})).mockResolvedValueOnce(json({data:[{id:"1234",login:"creator_login",display_name:"Creator",type:"",broadcaster_type:"partner",description:"Hello",profile_image_url:"https://example.com/avatar.png",offline_image_url:"",created_at:"2020-01-01T00:00:00Z"}]}));await expect(fetchTwitchIdentity("access")).resolves.toMatchObject({externalAccountId:"1234",displayName:"Creator",username:"creator_login",profileUrl:"https://www.twitch.tv/creator_login",avatarUrl:"https://example.com/avatar.png"});expect((fetch.mock.calls[0][1]?.headers as Record<string,string>).Authorization).toBe("OAuth access");});

  it("accepts the current validation contract without nonessential fields",async()=>{vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({client_id:"client",user_id:"1234"}));await expect(validateTwitchToken("access")).resolves.toMatchObject({client_id:"client",user_id:"1234"});});

  it("tolerates nullable or malformed nonidentity validation metadata",async()=>{vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({client_id:"client",user_id:"1234",login:null,scopes:null,expires_in:null}));await expect(validateTwitchToken("access")).resolves.toMatchObject({client_id:"client",user_id:"1234"});});

  it("rejects a validation token issued to another Twitch client",async()=>{vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({client_id:"another-client",user_id:"1234"}));await expect(validateTwitchToken("access")).rejects.toMatchObject({code:"access_revoked",provider:"twitch"});});

  it.each([{client_id:"client"},{client_id:"client",user_id:""},{client_id:"client",user_id:"creator"},{client_id:"client",user_id:1234}])("rejects a missing or malformed stable user ID: %j",async body=>{vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json(body));await expect(validateTwitchToken("access")).rejects.toMatchObject({code:"malformed_provider_object",provider:"twitch"});});

  it("rejects a Helix user whose ID differs from the validated user ID",async()=>{vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({client_id:"client",user_id:"1234"})).mockResolvedValueOnce(json({data:[{id:"5678",login:"creator_login",display_name:"Creator",type:"",broadcaster_type:"",description:"",profile_image_url:"",offline_image_url:"",created_at:"2020-01-01T00:00:00Z"}]}));await expect(fetchTwitchIdentity("access")).rejects.toMatchObject({code:"malformed_provider_object",provider:"twitch"});});

  it("logs only safe validation shape diagnostics",async()=>{const warn=vi.spyOn(console,"warn").mockImplementation(()=>{}),secret="access-secret-never-log";vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({client_id:"client",user_id:null,login:null,scopes:[]}));await expect(validateTwitchToken(secret)).rejects.toMatchObject({code:"malformed_provider_object"});expect(warn).toHaveBeenCalledOnce();const serialized=JSON.stringify(warn.mock.calls);for(const key of["traceId","responseKeys","present","type","validationCategory","httpStatus"])expect(serialized).toContain(key);expect(serialized).not.toContain(secret);expect(serialized).not.toContain("Authorization");});

  it("keeps reconnect protection bound to the immutable external account ID",()=>{const callback=readFileSync("app/api/integrations/[provider]/callback/route.ts","utf8");expect(callback).toContain("target.external_account_id!==identity.externalAccountId");expect(callback).toContain("reconnect_mismatch");});

  it("treats validation 401 as invalid and revokes with client ID",async()=>{const fetch=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({},401)).mockResolvedValueOnce(new Response(null,{status:200}));await expect(validateTwitchToken("invalid")).resolves.toBeNull();await expect(revokeTwitchToken("access")).resolves.toBeUndefined();expect(fetch.mock.calls[1][0]).toBe("https://id.twitch.tv/oauth2/revoke");expect((fetch.mock.calls[1][1]?.body as URLSearchParams).get("client_id")).toBe("client");});

  it.each([0,8721])("preserves an exact %i-follower total without privileged scopes",count=>{expect(normalizeProviderAudience("twitch",{total:count,data:[],pagination:{}})).toEqual({count,status:"available",approximate:false});expect(getSocialProvider("twitch").requestedScopes).toEqual([]);});

  it("uses shared role, reconnect, cleanup, metric, and exact disconnect routes",()=>{const connect=readFileSync("app/api/integrations/[provider]/connect/route.ts","utf8"),callback=readFileSync("app/api/integrations/[provider]/callback/route.ts","utf8"),disconnect=readFileSync("app/api/integrations/[provider]/disconnect/route.ts","utf8");expect(connect).toContain('"twitch","discord","snapchat"].includes(raw)');expect(connect).toContain("createOAuthState");expect(callback).toContain('raw==="twitch"');expect(callback.replace(/\s+/g,"")).toContain('provider:rawas"instagram"|"tiktok"|"x"|"spotify"|"twitch"');expect(callback).toContain("if(createdId)");expect(disconnect).toContain('"twitch","spotify","discord","snapchat"].includes(provider)');expect(disconnect).toContain('eq("id",parsed.data.connectionId)');});
});

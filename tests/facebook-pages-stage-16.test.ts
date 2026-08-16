import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {readFileSync} from "node:fs";
import {discoverMetaPages,exchangeMetaCode,fetchFacebookPageIdentity,graphVersion} from "@/lib/providers/meta";
import {facebookProvider} from "@/lib/social-providers/providers/facebook";
import {normalizeProviderAudience} from "@/lib/platform-audience/normalize";
import {resolveConnectionStatus} from "@/lib/social-providers/connection-health";
import {getSocialProvider} from "@/lib/social-providers/registry";

const original={...process.env};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
const page=(overrides:Record<string,unknown>={})=>({id:"12345678901234567890",name:"AudienceOwn Page",access_token:"page-secret",tasks:["ANALYZE"],username:"audienceown",link:"https://www.facebook.com/audienceown",picture:{data:{url:"https://example.com/page.jpg"}},...overrides});

describe("Stage 16 Facebook Pages official OAuth",()=>{
  beforeEach(()=>{vi.restoreAllMocks();Object.assign(process.env,{META_APP_ID:"app",META_APP_SECRET:"secret",FACEBOOK_REDIRECT_URI:"https://audienceown.com/api/integrations/facebook/callback",META_GRAPH_API_VERSION:"v26.0",META_APP_REVIEW_STATUS:"approved"});});
  afterEach(()=>{process.env={...original};vi.restoreAllMocks();});

  it("uses the versioned Facebook Login contract and only Page read permissions",async()=>{const url=new URL((await facebookProvider.createAuthorizationUrl!({state:"signed"})).url);expect(`${url.origin}${url.pathname}`).toBe("https://www.facebook.com/v26.0/dialog/oauth");expect(url.searchParams.get("scope")?.split(/[ ,]+/)).toEqual(["pages_show_list","pages_read_engagement"]);for(const forbidden of["pages_manage_posts","pages_manage_engagement","ads_management","business_management","pages_read_user_content","instagram_basic"])expect(url.searchParams.get("scope")).not.toContain(forbidden);});

  it("exchanges a short user token for a long-lived user token without exposing secrets",async()=>{const fetch=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({access_token:"short",token_type:"bearer",expires_in:3600})).mockResolvedValueOnce(json({access_token:"long",token_type:"bearer",expires_in:5_184_000}));await expect(exchangeMetaCode("one-time-code")).resolves.toMatchObject({accessToken:"long",refreshToken:null,grantedScopes:["pages_show_list","pages_read_engagement"]});expect(String(fetch.mock.calls[0][0])).toContain("/v26.0/oauth/access_token");});

  it("fails token exchange on provider failure or malformed success",async()=>{vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({error:{type:"OAuthException",code:190,message:"bad code"}},400));await expect(exchangeMetaCode("bad")).rejects.toThrow("meta_token_exchange_failed");vi.mocked(globalThis.fetch).mockResolvedValueOnce(json({expires_in:3600}));await expect(exchangeMetaCode("malformed")).rejects.toThrow("meta_token_exchange_failed");});

  it.each([[0,[]],[1,[page()]],[2,[page(),page({id:"2",name:"Second"})]]] as const)("discovers %i eligible Pages without requiring publishing tasks",async(_count,pages)=>{vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({data:pages}));const found=await discoverMetaPages("user-token");expect(found).toHaveLength(pages.length);if(found[0])expect(found[0]).toMatchObject({stableSourceId:String(found[0].stableSourceId),pageToken:"page-secret",metadata:{pictureUrl:"https://example.com/page.jpg"}});});

  it("fetches Page identity with optional presentation fields absent",async()=>{vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({id:"12345678901234567890",name:"AudienceOwn Page"}));await expect(fetchFacebookPageIdentity("page-token","12345678901234567890")).resolves.toMatchObject({externalAccountId:"12345678901234567890",displayName:"AudienceOwn Page",username:null,avatarUrl:null});});

  it("fails closed when selected and fetched Page IDs differ",async()=>{vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({id:"999",name:"Wrong Page"}));await expect(fetchFacebookPageIdentity("page-token","123")).rejects.toThrow("facebook_identity_mismatch");});

  it("normalizes zero and nonzero Page followers",()=>{expect(normalizeProviderAudience("facebook",{followers_count:0})).toMatchObject({count:0,status:"available"});expect(normalizeProviderAudience("facebook",{followers_count:12450})).toMatchObject({count:12450,status:"available"});});

  it("keeps review limitations connected and selection creator-actionable",()=>{expect(resolveConnectionStatus({health:"healthy",providerStatus:"app_review_required"})).toMatchObject({connectionLabel:"Connected",actionRequired:false});expect(resolveConnectionStatus({health:"healthy",providerStatus:"asset_selection_required"})).toMatchObject({actionRequired:true});});

  it("keeps Page credentials server-only and uses generic persistence/projection",()=>{const callback=readFileSync("app/api/integrations/meta/callback/route.ts","utf8"),selection=readFileSync("lib/providers/meta-server.ts","utf8"),picker=readFileSync("components/providers/meta-asset-selection.tsx","utf8");expect(callback).toContain("assets.length===1");expect(callback).toContain("no_eligible_pages");expect(selection).toContain("encryptSocialSecret(credential)");expect(selection).toContain("external_account_id!==stableId");expect(picker).not.toContain("pageToken");expect(picker).not.toContain("access_token");});

  it("regresses direct Instagram, TikTok, and YouTube registry paths",()=>{expect(graphVersion()).toBe("v26.0");for(const provider of["instagram","tiktok","youtube"]as const)expect(getSocialProvider(provider).capabilities.oauth).toBe(true);expect(readFileSync("lib/providers/meta.ts","utf8")).toContain("https://graph.instagram.com");});
});

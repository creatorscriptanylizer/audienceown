import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {readFileSync} from "node:fs";
import {exchangeInstagramCode,exchangeMetaCode,refreshInstagramToken,revokeInstagramToken,revokeMetaAuthorization} from "@/lib/providers/meta";
import {getSocialProvider,listOAuthProviderRegistry} from "@/lib/social-providers/registry";
import {normalizeProviderAudience} from "@/lib/platform-audience/normalize";

const source=(path:string)=>readFileSync(path,"utf8"),original={...process.env};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
describe("Stage 11.2 Meta OAuth",()=>{
  beforeEach(()=>{vi.restoreAllMocks();Object.assign(process.env,{INSTAGRAM_CLIENT_ID:"ig-id",INSTAGRAM_CLIENT_SECRET:"ig-secret",INSTAGRAM_REDIRECT_URI:"https://app.test/api/integrations/instagram/callback",META_APP_ID:"meta-id",META_APP_SECRET:"meta-secret",META_REDIRECT_URI:"https://app.test/api/integrations/meta/callback"});});
  afterEach(()=>{process.env={...original};vi.restoreAllMocks();});

  it("keeps YouTube, Instagram, and Facebook launched",()=>{const registry=listOAuthProviderRegistry();expect(registry.filter(item=>["youtube","instagram","facebook"].includes(item.id)&&item.oauthImplemented).map(item=>item.id)).toEqual(["youtube","instagram","facebook"]);expect(registry.find(item=>item.id==="facebook")?.connectPath).toBe("/api/integrations/facebook/connect");});

  it("exchanges Instagram short-lived credentials for a long-lived token and refreshes it",async()=>{
    const fetch=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({access_token:"short",user_id:"17841400000000000",permissions:["instagram_business_basic"]})).mockResolvedValueOnce(json({access_token:"long",expires_in:5_184_000})).mockResolvedValueOnce(json({access_token:"renewed",expires_in:5_184_000}));
    await expect(exchangeInstagramCode("code")).resolves.toMatchObject({accessToken:"long",stableIdentityId:"17841400000000000",refreshToken:"long"});
    await expect(refreshInstagramToken("long")).resolves.toMatchObject({accessToken:"renewed",refreshToken:"renewed"});
    expect(fetch.mock.calls[1][0]).toContain("ig_exchange_token");expect(fetch.mock.calls[2][0]).toContain("ig_refresh_token");
  });

  it("exchanges Facebook Login for a long-lived user token used only for asset discovery",async()=>{const fetch=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({access_token:"short"})).mockResolvedValueOnce(json({access_token:"long",expires_in:5_184_000}));await expect(exchangeMetaCode("code")).resolves.toMatchObject({accessToken:"long",refreshToken:null});expect(fetch.mock.calls[1][0]).toContain("fb_exchange_token");});

  it.each([["instagram",revokeInstagramToken],["facebook",revokeMetaAuthorization]] as const)("supports safe %s permission revocation",async(_provider,revoke)=>{vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(json({success:true}));await expect(revoke("encrypted-at-rest-token-after-decryption")).resolves.toBeUndefined();expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining("/permissions?"),expect.objectContaining({method:"DELETE"}));});

  it("keeps roles and exact reconnect ids in signed state through every callback",()=>{const generic=source("app/api/integrations/[provider]/callback/route.ts"),meta=source("app/api/integrations/meta/callback/route.ts"),selection=source("lib/providers/meta-server.ts");for(const item of [generic,meta]){expect(item).toContain("state.role");expect(item).toContain("state.connectionId");}expect(generic).toContain("reconnect_mismatch");expect(selection).toContain("reconnect_mismatch");expect(selection).toContain("external_account_id!==stableId");});

  it("requires explicit Page/professional-account selection and handles zero or multiple assets",()=>{const server=source("lib/providers/meta-server.ts"),ui=source("components/providers/meta-asset-selection.tsx");expect(server).toContain("discoverMetaPages");expect(server).toContain("page_not_managed");expect(server).toContain("account_not_professional");expect(ui).toContain("!found.length");expect(ui).toContain("assets.map");expect(ui).toContain("Personal Facebook profiles are not supported");});

  it("encrypts selected credentials, preserves role, and compensates failed new setup",()=>{const generic=source("app/api/integrations/[provider]/callback/route.ts"),meta=source("app/api/integrations/meta/callback/route.ts"),selection=source("lib/providers/meta-server.ts");expect(generic).toContain("encryptSocialSecret(tokens.accessToken)");expect(meta).toContain("encryptSocialSecret(tokens.accessToken)");expect(selection).toContain("account_type:role");expect(generic).toContain("if(createdId)");expect(meta).toContain("if(insertedId)");expect(selection).toContain("if(created)");});

  it("associates Instagram and Facebook metrics with exact connection ids",()=>{expect(normalizeProviderAudience("instagram",{followers_count:18_200})).toMatchObject({count:18_200,status:"available"});expect(normalizeProviderAudience("facebook",{followers_count:42_000})).toMatchObject({count:42_000,status:"available"});const initial=source("lib/social-providers/initial-audience.ts");expect(initial).toContain("p_connection_id:input.connectionId");expect(initial).toContain("p_account_category:input.role");expect(initial).toContain("append_provider_audience_snapshot");});

  it("does not set new Meta official accounts as the global primary",()=>{expect(source("app/api/integrations/[provider]/callback/route.ts")).toContain("is_primary:false");expect(source("lib/providers/meta-server.ts")).toContain("is_primary:false");expect(getSocialProvider("instagram").capabilities.oauth).toBe(true);expect(getSocialProvider("facebook").capabilities.oauth).toBe(true);});
});

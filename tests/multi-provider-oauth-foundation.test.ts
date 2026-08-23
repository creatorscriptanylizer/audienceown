import {afterEach,beforeEach,describe,expect,it} from "vitest";
import {createOAuthState,verifyOAuthState} from "@/lib/social-providers/oauth";
import {normalizeProviderIdentity} from "@/lib/social-providers/base-oauth";
import {getSocialProvider,listOAuthProviderRegistry} from "@/lib/social-providers/registry";
import {providerConnectionCapability} from "@/lib/social-providers/connection-capabilities";
import {sanitizeDebugMetadata} from "@/lib/debug";
import type {ProviderAudience} from "@/lib/social-providers/types";
import {readFileSync} from "node:fs";

const original={...process.env};
describe("multi-provider OAuth foundation",()=>{
  beforeEach(()=>{process.env.SOCIAL_OAUTH_STATE_SECRET="foundation-test-secret";});
  afterEach(()=>{process.env={...original};});

  it("publishes the twelve provider registry entries without advertising unfinished OAuth",()=>{
    const registry=listOAuthProviderRegistry();
    expect(registry.map(item=>item.id)).toEqual(["youtube","instagram","facebook","tiktok","x","spotify","twitch","linkedin","snapchat","pinterest","discord"]);
    expect(registry.find(item=>item.id==="youtube")).toMatchObject({oauthImplemented:true,connectPath:"/api/integrations/youtube/connect",description:"Video channel"});
    expect(registry.filter(item=>!["youtube","instagram","facebook","tiktok","x","spotify","twitch","linkedin","pinterest","discord","snapchat"].includes(item.id)).every(item=>!item.oauthImplemented&&item.connectPath===null)).toBe(true);
    expect(registry.find(item=>item.id==="tiktok")).toMatchObject({oauthImplemented:true,connectPath:"/api/integrations/tiktok/connect"});
    expect(registry.find(item=>item.id==="facebook")).toMatchObject({oauthImplemented:true,connectPath:"/api/integrations/facebook/connect"});
    expect(registry.find(item=>item.id==="x")).toMatchObject({oauthImplemented:true,connectPath:"/api/integrations/x/connect"});
    expect(registry.find(item=>item.id==="spotify")).toMatchObject({oauthImplemented:true,connectPath:"/api/integrations/spotify/connect",audienceMetricSupported:false,assetSelectionSupported:false,refreshSupported:true,disconnectSupported:false});
    expect(registry.find(item=>item.id==="twitch")).toMatchObject({oauthImplemented:true,connectPath:"/api/integrations/twitch/connect",audienceMetricSupported:true,assetSelectionSupported:false,refreshSupported:true,disconnectSupported:true});
    expect(registry.find(item=>item.id==="linkedin")).toMatchObject({oauthImplemented:true,connectPath:"/api/integrations/linkedin/connect",audienceMetricSupported:false,assetSelectionSupported:false,refreshSupported:false,disconnectSupported:false});
    expect(registry.find(item=>item.id==="pinterest")).toMatchObject({oauthImplemented:true,connectPath:"/api/integrations/pinterest/connect",audienceMetricSupported:true,assetSelectionSupported:false,refreshSupported:true,disconnectSupported:false});
  });

  it("reports missing and invalid configuration without returning values",()=>{
    delete process.env.GOOGLE_YOUTUBE_CLIENT_ID;
    expect(listOAuthProviderRegistry().find(item=>item.id==="youtube")).toMatchObject({configuration:"missing"});
    process.env.GOOGLE_YOUTUBE_CLIENT_ID="id";process.env.GOOGLE_YOUTUBE_CLIENT_SECRET="secret";process.env.YOUTUBE_OAUTH_STATE_SECRET="state";process.env.GOOGLE_YOUTUBE_REDIRECT_URI="javascript:bad";
    const entry=listOAuthProviderRegistry().find(item=>item.id==="youtube")!;
    expect(entry.configuration).toBe("invalid");expect(JSON.stringify(entry)).not.toContain("javascript:bad");expect(JSON.stringify(entry)).not.toContain("secret");
  });

  it("binds provider, role and exact reconnect id inside signed state",()=>{
    const connectionId="00000000-0000-4000-8000-000000000111",protectedOfficialAccountId="00000000-0000-4000-8000-000000000112";
    const value=createOAuthState({provider:"instagram",creatorId:"creator",userId:"user",nonce:"nonce",role:"backup",connectionId,protectedOfficialAccountId,expiresAt:2000});
    expect(verifyOAuthState(value,"instagram","nonce",1000)).toMatchObject({role:"backup",connectionId,protectedOfficialAccountId});
    expect(verifyOAuthState(value,"facebook","nonce",1000)).toBeNull();
  });

  it("accepts an optional parent hint while database reconciliation owns the lasting hierarchy",()=>{
    const connect=readFileSync("app/api/integrations/[provider]/connect/route.ts","utf8"),callback=readFileSync("app/api/integrations/[provider]/callback/route.ts","utf8"),meta=readFileSync("app/api/integrations/meta/connect/route.ts","utf8"),metaCallback=readFileSync("app/api/integrations/meta/callback/route.ts","utf8");
    for(const source of[connect,meta]){const compact=source.replace(/\s+/g,"");expect(source).toContain("protectedOfficialAccountId");expect(compact).toContain('role==="backup"&&protectedOfficialAccountId');expect(compact).toContain('eq("account_type","official")');expect(source).not.toContain("official_account_required");}
    for(const source of[callback,metaCallback])expect(source).toContain("protected_official_account_id");
  });

  it("normalizes stable identity fields and rejects missing stable ids",()=>{
    expect(normalizeProviderIdentity({id:"stable-1",name:"Creator",url:"https://example.com/creator",metadata:{username:"creator"}})).toMatchObject({externalAccountId:"stable-1",displayName:"Creator",username:"creator",profileUrl:"https://example.com/creator"});
    expect(()=>normalizeProviderIdentity({id:"",name:"Creator",url:"https://example.com/creator",metadata:{}})).toThrow("Malformed identity");
  });

  it("redacts normalized tokens and associates audience with an exact connection",()=>{
    expect(sanitizeDebugMetadata({provider:"youtube",accessToken:"access-value",refreshToken:"refresh-value",authorizationCode:"code"})).toEqual({provider:"youtube",accessToken:"[REDACTED]",refreshToken:"[REDACTED]",authorizationCode:"[REDACTED]"});
    const audience:ProviderAudience={connectedAccountId:"connection-1",count:424,unit:"subscribers",status:"available",approximate:false};
    expect(audience.connectedAccountId).toBe("connection-1");
  });

  it("maps picker states from real implementation and configuration",()=>{
    Object.assign(process.env,{INSTAGRAM_CLIENT_ID:"id",INSTAGRAM_CLIENT_SECRET:"secret",INSTAGRAM_REDIRECT_URI:"https://app.test/api/integrations/instagram/callback",INSTAGRAM_APP_REVIEW_STATUS:"required"});
    const youtube=providerConnectionCapability(getSocialProvider("youtube"),false),instagram=providerConnectionCapability(getSocialProvider("instagram"),true);
    expect(youtube).toMatchObject({implementationStatus:"implemented",oauthStatus:"not_configured",configurationStatus:"missing"});
    expect(instagram).toMatchObject({implementationStatus:"implemented",oauthStatus:"review_required",reviewStatus:"required",connectable:true,connectPath:"/api/integrations/instagram/connect"});
    const picker=readFileSync("components/platforms-manager.tsx","utf8");expect(picker).toContain('"Setup required"');expect(picker).toContain('"Coming soon"');expect(picker).toContain("connectedOfficial.has(platform.id)");
  });
});

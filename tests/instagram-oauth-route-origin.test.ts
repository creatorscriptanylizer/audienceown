import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";

const h=vi.hoisted(()=>({
  getViewer:vi.fn(),getCreator:vi.fn(),set:vi.fn(),del:vi.fn(),exchange:vi.fn(),fetchIdentity:vi.fn(),
  cookieValue:undefined as string|undefined,
}));

vi.mock("next/headers",()=>({cookies:async()=>({
  get:()=>h.cookieValue?{value:h.cookieValue}:undefined,
  set:h.set,
  delete:(name:string)=>{h.del(name);h.cookieValue=undefined;},
})}));
vi.mock("@/lib/dal",()=>({getViewer:h.getViewer,getCreator:h.getCreator}));
vi.mock("@/lib/provider-entitlements",()=>({canCreateProviderConnection:vi.fn(async()=>({allowed:true})),isConnectionLimitError:()=>false}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:()=>({})}));
vi.mock("@/lib/social-providers/registry",()=>({getSocialProvider:()=>({
  capabilities:{oauth:true},requestedScopes:["instagram_business_basic"],
  createAuthorizationUrl:async({state}:{state:string})=>({url:`https://www.instagram.com/oauth/authorize?state=${encodeURIComponent(state)}`}),
  exchangeAuthorizationCode:h.exchange,fetchIdentity:h.fetchIdentity,
})}));

import {GET as connect} from "@/app/api/integrations/[provider]/connect/route";
import {GET as callback} from "@/app/api/integrations/[provider]/callback/route";
import {createOAuthState} from "@/lib/social-providers/oauth";

const original={...process.env};
const context={params:Promise.resolve({provider:"instagram"})};

describe("Instagram OAuth same-origin routes",()=>{
  beforeEach(()=>{
    Object.assign(process.env,{APP_URL:"https://tunnel.example",SOCIAL_OAUTH_STATE_SECRET:"test-state-secret-with-enough-entropy",INSTAGRAM_CLIENT_ID:"id",INSTAGRAM_CLIENT_SECRET:"secret",INSTAGRAM_REDIRECT_URI:"https://tunnel.example/api/integrations/instagram/callback"});
    h.cookieValue=undefined;h.getViewer.mockResolvedValue({id:"user"});h.getCreator.mockResolvedValue({id:"creator"});
    h.exchange.mockResolvedValue({accessToken:"token",stableIdentityId:"instagram-user",grantedScopes:["instagram_business_basic"],tokenType:"bearer"});
    h.fetchIdentity.mockResolvedValue({externalAccountId:"instagram-user",displayName:"Creator",username:"creator",profileUrl:"https://instagram.com/creator",avatarUrl:null,metadata:{}});
    vi.clearAllMocks();
  });
  afterEach(()=>{process.env={...original};});

  it("redirects localhost before auth or state-cookie creation",async()=>{
    const response=await connect(new Request("http://localhost:3000/api/integrations/instagram/connect?role=backup&returnTo=onboarding&flow=kept"),context);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://tunnel.example/connect/provider?provider=instagram&role=backup");
    expect(h.getViewer).not.toHaveBeenCalled();expect(h.set).not.toHaveBeenCalled();
  });

  it("creates a secure tunnel cookie and then generates Instagram authorization",async()=>{
    const response=await connect(new Request("https://tunnel.example/api/integrations/instagram/connect?role=official"),context);
    expect(response.headers.get("location")).toMatch(/^https:\/\/www\.instagram\.com\/oauth\/authorize\?state=/);
    expect(h.set).toHaveBeenCalledWith("social_oauth_instagram",expect.any(String),expect.objectContaining({httpOnly:true,secure:true,sameSite:"lax",maxAge:600}));
  });

  it("continues to Instagram behind Cloudflare without a canonical redirect",async()=>{
    const response=await connect(new Request("http://localhost:3000/api/integrations/instagram/connect?role=official",{headers:{host:"localhost:3000","x-forwarded-host":"tunnel.example","x-forwarded-proto":"https"}}),context);
    expect(response.headers.get("location")).toMatch(/^https:\/\/www\.instagram\.com\/oauth\/authorize\?state=/);
    expect(response.headers.get("location")).not.toContain("tunnel.example/api/integrations/instagram/connect");
    expect(h.getViewer).toHaveBeenCalledOnce();expect(h.set).toHaveBeenCalledWith("social_oauth_instagram",expect.any(String),expect.objectContaining({secure:true}));
  });

  it.each(["official","backup"])("preserves the %s role through canonicalization",async(role)=>{
    const response=await connect(new Request(`http://localhost:3000/api/integrations/instagram/connect?role=${role}&returnTo=onboarding&reconnect=keep`),context);
    expect(response.headers.get("location")).toBe(`https://tunnel.example/connect/provider?provider=instagram&role=${role}`);
    expect(h.set).not.toHaveBeenCalled();
  });

  it("preserves reconnect connectionId parameters through canonicalization",async()=>{
    const url="http://localhost:3000/api/integrations/instagram/connect?role=backup&connectionId=00000000-0000-4000-8000-000000000001&returnTo=onboarding";
    const response=await connect(new Request(url),context);
    expect(response.headers.get("location")).toBe("https://tunnel.example/connect/provider?provider=instagram&role=backup");
    expect(h.getViewer).not.toHaveBeenCalled();expect(h.set).not.toHaveBeenCalled();
  });

  it("gives YouTube its own fail-closed canonical-origin guard",async()=>{
    const source=await import("node:fs/promises").then(fs=>fs.readFile("app/api/integrations/youtube/connect/route.ts","utf8"));
    expect(source).toContain("oauthOriginCheck");expect(source).toContain("canonicalProviderHandoffUrl");expect(source).not.toContain("canonicalOAuthRequest");
  });

  function prepareState(nonce="nonce"){
    h.cookieValue=JSON.stringify({nonce});
    return createOAuthState({creatorId:"creator",userId:"user",provider:"instagram",nonce,role:"official",expiresAt:Date.now()+60_000});
  }

  it("reaches token exchange with matching tunnel state and cookie",async()=>{
    const state=prepareState();
    await callback(new Request(`https://tunnel.example/api/integrations/instagram/callback?state=${encodeURIComponent(state)}&code=one-time-code`),context);
    expect(h.exchange).toHaveBeenCalledWith({code:"one-time-code",codeVerifier:undefined});
    expect(h.fetchIdentity).toHaveBeenCalledWith({accessToken:"token",metadata:{externalAccountId:"instagram-user"}});
    expect(h.del).toHaveBeenCalledWith("social_oauth_instagram");
  });

  it("fails safely when Instagram returns no eligible authenticated asset",async()=>{
    h.exchange.mockResolvedValueOnce({accessToken:"token",grantedScopes:["instagram_business_basic"],tokenType:"bearer"});
    const state=prepareState(),response=await callback(new Request(`https://tunnel.example/api/integrations/instagram/callback?state=${encodeURIComponent(state)}&code=one-time-code`),context);
    expect(response.headers.get("location")).toContain("instagram:connection_failed");expect(h.fetchIdentity).not.toHaveBeenCalled();
  });

  it("rejects a missing nonce cookie and tampered state before exchange",async()=>{
    const state=createOAuthState({creatorId:"creator",userId:"user",provider:"instagram",nonce:"nonce",role:"official",expiresAt:Date.now()+60_000});
    let response=await callback(new Request(`https://tunnel.example/api/integrations/instagram/callback?state=${encodeURIComponent(state)}&code=code`),context);
    expect(response.headers.get("location")).toContain("instagram:invalid_state");expect(h.exchange).not.toHaveBeenCalled();
    h.cookieValue=JSON.stringify({nonce:"nonce"});
    response=await callback(new Request(`https://tunnel.example/api/integrations/instagram/callback?state=${encodeURIComponent(state+"x")}&code=code`),context);
    expect(response.headers.get("location")).toContain("instagram:invalid_state");expect(h.exchange).not.toHaveBeenCalled();
  });

  it("rejects replay after the single-use cookie is consumed",async()=>{
    const state=prepareState();const url=`https://tunnel.example/api/integrations/instagram/callback?state=${encodeURIComponent(state)}&code=code`;
    await callback(new Request(url),context);h.exchange.mockClear();
    const replay=await callback(new Request(url),context);
    expect(replay.headers.get("location")).toContain("instagram:invalid_state");expect(h.exchange).not.toHaveBeenCalled();
  });
});

import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {createOAuthState,validateOAuthState} from "@/lib/social-providers/oauth";
import {canonicalOAuthRequest,oauthOriginCheck} from "@/lib/oauth-origin";

const original={...process.env};

describe("OAuth canonical production origin",()=>{
  beforeEach(()=>{process.env.APP_URL="https://audienceown.com";process.env.SOCIAL_OAUTH_STATE_SECRET="test-state-secret-with-enough-entropy";});
  afterEach(()=>{process.env={...original};vi.restoreAllMocks();});

  it("redirects localhost to the tunnel with every flow parameter intact",()=>{
    const request=new Request("http://localhost:3000/api/integrations/instagram/connect?role=backup&returnTo=onboarding&step=backup&connectionId=00000000-0000-4000-8000-000000000001&flow=provider-metadata");
    const target=canonicalOAuthRequest(request);
    expect(target?.toString()).toBe("https://audienceown.com/api/integrations/instagram/connect?role=backup&returnTo=onboarding&step=backup&connectionId=00000000-0000-4000-8000-000000000001&flow=provider-metadata");
  });

  it("does not redirect a request already on the canonical origin",()=>{
    expect(canonicalOAuthRequest(new Request("https://audienceown.com/api/integrations/instagram/connect?role=official"))).toBeNull();
  });

  it("uses Cloudflare's forwarded origin only when it exactly matches APP_URL",()=>{
    const request=new Request("http://localhost:3000/api/integrations/instagram/connect?role=official",{headers:{"x-forwarded-host":"audienceown.com","x-forwarded-proto":"https"}});
    expect(oauthOriginCheck(request)).toMatchObject({configuredOrigin:"https://audienceown.com",externalOrigin:"https://audienceown.com",redirectRequired:false,redirectTarget:null,loopDetected:false});
  });

  it("supports the standard Forwarded header for the configured origin",()=>{
    const request=new Request("http://localhost:3000/api/integrations/instagram/connect?role=backup",{headers:{forwarded:'for=192.0.2.1;proto=https;host="audienceown.com"'}});
    expect(oauthOriginCheck(request).externalOrigin).toBe("https://audienceown.com");
    expect(canonicalOAuthRequest(request)).toBeNull();
  });

  it("does not let an untrusted forwarded host override the canonical origin",()=>{
    const request=new Request("http://localhost:3000/api/integrations/instagram/connect?role=official",{headers:{"x-forwarded-host":"attacker.example","x-forwarded-proto":"https"}});
    const check=oauthOriginCheck(request);
    expect(check.externalOrigin).toBe("http://localhost:3000");
    expect(check.redirectTarget?.toString()).toBe("https://audienceown.com/api/integrations/instagram/connect?role=official");
  });

  it("reports safe validation reasons for missing guarantees",()=>{
    const state=createOAuthState({creatorId:"creator",userId:"user",provider:"instagram",nonce:"nonce",role:"official",expiresAt:2_000});
    expect(validateOAuthState(`${state}tampered`,"instagram","nonce",1_000)).toEqual({ok:false,reason:"state_signature_invalid"});
    expect(validateOAuthState(state,"facebook","nonce",1_000)).toEqual({ok:false,reason:"provider_mismatch"});
    expect(validateOAuthState(state,"instagram","wrong",1_000)).toEqual({ok:false,reason:"nonce_mismatch"});
    expect(validateOAuthState(state,"instagram","nonce",2_001)).toEqual({ok:false,reason:"state_expired"});
    expect(validateOAuthState(state,"instagram","nonce",1_000)).toMatchObject({ok:true,state:{creatorId:"creator",provider:"instagram"}});
  });
});

import {afterEach,describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {appUrl} from "@/lib/app-url";
import {canonicalOAuthOrigin,oauthCallbackOrigin,oauthOriginCheck} from "@/lib/oauth-origin";

const original={...process.env};
afterEach(()=>{process.env={...original};});

describe("Stage 17 canonical production origin",()=>{
  it("uses APP_URL as the authoritative server origin",()=>{process.env.APP_URL="https://audienceown.com/ignored";process.env.NEXT_PUBLIC_APP_URL="https://dev.audienceown.com";expect(appUrl()).toBe("https://audienceown.com");expect(appUrl("/auth/callback")).toBe("https://audienceown.com/auth/callback");expect(canonicalOAuthOrigin()).toBe("https://audienceown.com");});

  it("canonicalizes an internal localhost request to production",()=>{process.env.APP_URL="https://audienceown.com";const check=oauthOriginCheck(new Request("http://localhost:3000/api/integrations/tiktok/connect?role=official"));expect(check).toMatchObject({externalOrigin:"http://localhost:3000",redirectRequired:true,loopDetected:false});expect(check.redirectTarget?.toString()).toBe("https://audienceown.com/api/integrations/tiktok/connect?role=official");});

  it("trusts only an exact forwarded production origin without looping",()=>{process.env.APP_URL="https://audienceown.com";const trusted=oauthOriginCheck(new Request("http://localhost:3000/api/integrations/instagram/connect",{headers:{"x-forwarded-host":"audienceown.com","x-forwarded-proto":"https"}}));expect(trusted).toMatchObject({externalOrigin:"https://audienceown.com",redirectRequired:false,redirectTarget:null,loopDetected:false});const malicious=oauthOriginCheck(new Request("http://localhost:3000/api/integrations/instagram/connect",{headers:{"x-forwarded-host":"evil.example","x-forwarded-proto":"https"}}));expect(malicious.externalOrigin).toBe("http://localhost:3000");expect(malicious.redirectTarget?.origin).toBe("https://audienceown.com");});

  it("does not treat the development ingress as canonical",()=>{process.env.APP_URL="https://audienceown.com";const check=oauthOriginCheck(new Request("https://dev.audienceown.com/api/integrations/instagram/connect"));expect(check.redirectRequired).toBe(true);expect(check.redirectTarget?.origin).toBe("https://audienceown.com");});

  it("keeps localhost available when explicitly configured for development",()=>{process.env.APP_URL="http://localhost:3000";expect(appUrl("/auth/callback")).toBe("http://localhost:3000/auth/callback");expect(oauthOriginCheck(new Request("http://localhost:3000/api/integrations/instagram/connect")).redirectRequired).toBe(false);});

  it.each(["localhost","127.0.0.1"])("normalizes an HTTPS %s callback origin to local HTTP",host=>{process.env.APP_URL=`https://${host}:3000`;const request=new Request(`https://${host}:3000/api/integrations/discord/callback?code=redacted`);expect(appUrl("/dashboard/platforms")).toBe(`http://${host}:3000/dashboard/platforms`);expect(canonicalOAuthOrigin()).toBe(`http://${host}:3000`);expect(oauthCallbackOrigin(request)).toBe(`http://${host}:3000`);});

  it("keeps the production callback and post-OAuth dashboard origin on HTTPS",()=>{process.env.APP_URL="https://audienceown.com";expect(oauthCallbackOrigin(new Request("http://localhost:3000/api/integrations/discord/callback"))).toBe("https://audienceown.com");expect(appUrl("/api/integrations/discord/callback")).toBe("https://audienceown.com/api/integrations/discord/callback");});

  it("normalizes a loopback callback request when APP_URL is absent without trusting forwarded hosts",()=>{delete process.env.APP_URL;const local=new Request("https://localhost:3000/api/integrations/discord/callback",{headers:{"x-forwarded-host":"attacker.example","x-forwarded-proto":"https"}});expect(oauthCallbackOrigin(local)).toBe("http://localhost:3000");expect(oauthCallbackOrigin(new Request("https://audienceown.com/api/integrations/discord/callback"))).toBe("https://audienceown.com");});

  it("configures canonical provider callbacks and public metadata",()=>{const env=readFileSync(".env.example","utf8"),layout=readFileSync("app/layout.tsx","utf8"),next=readFileSync("next.config.ts","utf8");expect(env).toContain("APP_URL=https://audienceown.com");for(const callback of["/api/integrations/facebook/callback","/api/integrations/tiktok/callback","/api/integrations/instagram/callback","/api/integrations/youtube/callback"])expect(env).toContain(`https://audienceown.com${callback}`);expect(layout).toContain("metadataBase: new URL(appUrl())");expect(next).toContain('allowedDevOrigins: ["dev.audienceown.com", "audienceown.com"]');});

  it("keeps production links on APP_URL rather than request or public configuration",()=>{for(const file of["app/dashboard/audience/page.tsx","app/dashboard/creator-page/page.tsx","app/onboarding/recovery-pass/page.tsx","app/onboarding/ready/page.tsx","lib/dashboard/creator-dashboard.ts","app/api/billing/checkout/route.ts","app/api/billing/portal/route.ts"])expect(readFileSync(file,"utf8")).toContain("appUrl()");});
});

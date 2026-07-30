import { beforeEach,describe,expect,it } from "vitest";
import { listSocialProviders,getSocialProvider } from "@/lib/social-providers/registry";
import { socialProviders } from "@/lib/social-providers/types";
import { validateNormalizedContent } from "@/lib/social-providers/normalize";
import { createOAuthState,verifyOAuthState,createPkce } from "@/lib/social-providers/oauth";
import { SocialProviderError,isRetryableProviderError } from "@/lib/social-providers/errors";

describe("social provider contracts",()=>{
 beforeEach(()=>{process.env.SOCIAL_OAUTH_STATE_SECRET="test-state-secret";});
 it("registers every supported provider exactly once",()=>{expect(listSocialProviders().map((x)=>x.provider).sort()).toEqual([...socialProviders].sort());});
 it.each(socialProviders)("%s exposes a complete capability matrix",(provider)=>{
  const adapter=getSocialProvider(provider);expect(adapter.provider).toBe(provider);expect(Object.keys(adapter.capabilities)).toHaveLength(12);
  expect(!adapter.capabilities.automaticPublishing||adapter.capabilities.automaticDrafts).toBe(true);
 });
 it("binds OAuth state to creator, user, provider, nonce, and expiry",()=>{
  const state=createOAuthState({creatorId:"c",userId:"u",provider:"x",nonce:"n",expiresAt:2000});
  expect(verifyOAuthState(state,"x","n",1000)?.creatorId).toBe("c");
  expect(verifyOAuthState(state,"tiktok","n",1000)).toBeNull();expect(verifyOAuthState(state,"x","bad",1000)).toBeNull();
  expect(verifyOAuthState(state,"x","n",3000)).toBeNull();
 });
 it("creates S256 PKCE material",()=>{const pkce=createPkce();expect(pkce.verifier.length).toBeGreaterThan(40);expect(pkce.challenge).not.toBe(pkce.verifier);});
 it("rejects malformed normalized objects",()=>{expect(validateNormalizedContent({provider:"instagram",externalObjectId:"",objectType:"post",
  eventType:"published",title:null,description:null,canonicalUrl:"https://instagram.com/p/a",thumbnailUrl:null,mediaUrls:[],
  sourcePublishedAt:"2026-01-01T00:00:00Z",scheduledStartAt:null,liveStatus:null,rawMetadata:{}})).toBeNull();});
 it("rejects provider-host mismatches",()=>{expect(validateNormalizedContent({provider:"instagram",externalObjectId:"a",objectType:"post",
  eventType:"published",title:null,description:null,canonicalUrl:"https://evil.example/a",thumbnailUrl:null,mediaUrls:[],
  sourcePublishedAt:"2026-01-01T00:00:00Z",scheduledStartAt:null,liveStatus:null,rawMetadata:{}})).toBeNull();});
 it("classifies only transient and rate-limit failures as retryable",()=>{
  expect(isRetryableProviderError(new SocialProviderError("transient","x","temporary"))).toBe(true);
  expect(isRetryableProviderError(new SocialProviderError("provider_plan_required","x","tier"))).toBe(false);
 });
 it("unsupported methods return a typed capability error",async()=>{
  await expect(getSocialProvider("snapchat").pollContent?.({accessToken:"x"})).rejects.toMatchObject({code:"provider_capability_not_supported"});
 });
 it("never places client secrets in authorization URLs",async()=>{
  process.env.SNAPCHAT_CLIENT_ID="client";process.env.SNAPCHAT_CLIENT_SECRET="super-secret";process.env.SNAPCHAT_REDIRECT_URI="https://example.test/cb";
  const result=await getSocialProvider("snapchat").createAuthorizationUrl?.({state:"state"});
  expect(result?.url).toContain("client");expect(result?.url).not.toContain("super-secret");
 });
});

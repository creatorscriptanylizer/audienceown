import { describe, expect, it } from "vitest";
import { canonicalExpansionThreeUrl, classifyExpansionThreeError, manualExpansionThreeContent } from "@/lib/providers/provider-expansion-three";
import { xProvider } from "@/lib/social-providers/providers/x";
import { linkedinProvider } from "@/lib/social-providers/providers/linkedin";
import { providerReadiness } from "@/lib/social-providers/readiness";

describe("Stage 8.4 exact manual URLs", () => {
  it("accepts X status URLs", () => expect(manualExpansionThreeContent("x", { url: "https://x.com/creator/status/12345", title: "Post", publishedAt: "2026-08-02T10:00:00.000Z" })).toEqual(expect.objectContaining({ externalObjectId: "manual:12345", rawMetadata: expect.objectContaining({ trustEligible: false }) })));
  it("rejects X profiles as content", () => expect(manualExpansionThreeContent("x", { url: "https://x.com/creator", title: "Profile", publishedAt: "2026-08-02T10:00:00.000Z" })).toBeNull());
  it("accepts LinkedIn public update URLs", () => expect(manualExpansionThreeContent("linkedin", { url: "https://www.linkedin.com/feed/update/urn:li:activity:12345", title: "Update", publishedAt: "2026-08-02T10:00:00.000Z" })).not.toBeNull());
  it("rejects lookalike hosts", () => expect(canonicalExpansionThreeUrl("linkedin", "https://linkedin.com.evil.example/feed/update/urn:li:activity:1")).toBeNull());
  it("requires trustworthy timestamps", () => expect(manualExpansionThreeContent("x", { url: "https://x.com/a/status/1", title: "Post", publishedAt: "today" })).toBeNull());
});

describe("provider boundaries", () => {
  it("X authorization uses S256 PKCE and exact read-only scopes", async () => { process.env.X_CLIENT_ID = "id"; process.env.X_REDIRECT_URI = "https://example.com/callback"; const url = new URL((await xProvider.createAuthorizationUrl!({ state: "signed", codeChallenge: "challenge" })).url),scopes=url.searchParams.get("scope")?.split(" ")??[]; expect(url.searchParams.get("code_challenge_method")).toBe("S256"); expect(scopes).toEqual(["tweet.read","users.read","offline.access"]);expect(scopes).not.toContain("tweet.write");expect(scopes.some(scope=>scope.startsWith("dm."))).toBe(false); });
  it("X never defaults to an approved tier", () => { delete process.env.X_API_ACCESS_TIER; expect(providerReadiness(xProvider).contentDetectionAvailable).toBe(false); });
  it("LinkedIn OIDC wording is explicitly non-verifying", () => expect(providerReadiness(linkedinProvider).limitations.join(" ")).toContain("not LinkedIn real-world identity verification"));
  it("LinkedIn restricted products default disabled", () => { delete process.env.LINKEDIN_MEMBER_SOCIAL_ENABLED; delete process.env.LINKEDIN_ORGANIZATION_SOCIAL_ENABLED; expect(providerReadiness(linkedinProvider).contentDetectionAvailable).toBe(false); });
  it("disables publishing", () => { for (const adapter of [xProvider, linkedinProvider]) expect(adapter.capabilities.automaticPublishing).toBe(false); });
  it("exposes manual import", () => { for (const adapter of [xProvider, linkedinProvider]) expect(providerReadiness(adapter).manualImportAvailable).toBe(true); });
  it("classifies rate limits as retryable", () => expect(classifyExpansionThreeError(new Error("rate_limited"))).toEqual(expect.objectContaining({ retryable: true })));
});

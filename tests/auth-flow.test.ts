import { describe, expect, it } from "vitest";
import { LOCAL_GOOGLE_UNAVAILABLE, localGoogleConfigured, mapOAuthError, safeNextPath, shouldOfferGoogle } from "@/lib/auth-flow";

describe("authentication flow safety", () => {
  it("preserves valid dashboard redirects", () => expect(safeNextPath("/dashboard?tab=accounts")).toBe("/dashboard?tab=accounts"));
  it.each([
    "https://evil.example",
    "//evil.example",
    "javascript:alert(1)",
    "data:text/html,evil",
    "/%2F%2Fevil.example",
    "/https:%2F%2Fevil.example",
    "not-a-path",
  ])("rejects or safely contains malicious next destination %s", (value) => {
    const result = safeNextPath(value);
    expect(result.startsWith("/")).toBe(true);
    expect(result.startsWith("//")).toBe(false);
    expect(() => new URL(result, "https://audienceown.com")).not.toThrow();
    expect(new URL(result, "https://audienceown.com").origin).toBe("https://audienceown.com");
  });
  it("maps provider-disabled errors to safe copy", () => {
    expect(mapOAuthError({ message: "Unsupported provider: provider is not enabled" })).toBe("google_not_configured");
    expect(LOCAL_GOOGLE_UNAVAILABLE).not.toContain("Unsupported provider");
  });
  it("requires both local Google credential variables", () => {
    expect(localGoogleConfigured({ SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID: "id" })).toBe(false);
    expect(localGoogleConfigured({ SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID: "id", SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET: "secret" })).toBe(true);
  });
  it("keeps Google visible in production/hosted environments and gates it locally", () => {
    expect(shouldOfferGoogle({ NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co" })).toBe(true);
    expect(shouldOfferGoogle({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" })).toBe(false);
  });
});

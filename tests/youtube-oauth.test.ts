import { beforeEach, describe, expect, it, vi } from "vitest";

describe("YouTube OAuth", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.GOOGLE_YOUTUBE_CLIENT_ID = "client";
    process.env.GOOGLE_YOUTUBE_CLIENT_SECRET = "secret";
    process.env.GOOGLE_YOUTUBE_REDIRECT_URI = "https://example.test/callback";
    process.env.YOUTUBE_OAUTH_STATE_SECRET = "state-secret";
  });

  it("validates signed, owned, unexpired state", async () => {
    const { createYouTubeOAuthState, verifyYouTubeOAuthState } = await import("@/lib/youtube-oauth");
    const state = createYouTubeOAuthState({ creatorId: "creator", userId: "user", nonce: "nonce", expiresAt: 2000, role:"backup", connectionId:"connection-1" });
    expect(verifyYouTubeOAuthState(state, "nonce", 1000)).toMatchObject({ creatorId:"creator", role:"backup", connectionId:"connection-1" });
    expect(verifyYouTubeOAuthState(state, "other", 1000)).toBeNull();
    expect(verifyYouTubeOAuthState(`${state}x`, "nonce", 1000)).toBeNull();
    expect(verifyYouTubeOAuthState(state, "nonce", 3000)).toBeNull();
  });

  it("refreshes without exposing credentials in the URL", async () => {
    const { refreshYouTubeAccessToken } = await import("@/lib/youtube-oauth");
    const fetcher = vi.fn(async (_url, init) => {
      expect(String(init?.body)).toContain("refresh_token=refresh");
      return Response.json({ access_token: "access", expires_in: 3600 });
    }) as unknown as typeof fetch;
    await expect(refreshYouTubeAccessToken("refresh", fetcher)).resolves.toMatchObject({ access_token: "access" });
  });

  it("classifies revoked refresh grants as reconnect-required authentication failures", async () => {
    const { refreshYouTubeAccessToken } = await import("@/lib/youtube-oauth");
    const fetcher = vi.fn(async () => Response.json({ error: "invalid_grant" }, { status: 400 })) as unknown as typeof fetch;
    await expect(refreshYouTubeAccessToken("expired", fetcher)).rejects.toMatchObject({ code: "invalid_grant" });
  });

  it("respects provider retry guidance for rate limits", async () => {
    const { refreshYouTubeAccessToken } = await import("@/lib/youtube-oauth");
    const fetcher = vi.fn(async () => Response.json({ error: "rate_limit_exceeded" }, { status: 429, headers: { "retry-after": "120" } })) as unknown as typeof fetch;
    await expect(refreshYouTubeAccessToken("refresh", fetcher)).rejects.toMatchObject({ code: "oauth_rate_limited", retryAfterSeconds: 120 });
  });

  it("normalizes network and malformed token responses", async () => {
    const { refreshYouTubeAccessToken } = await import("@/lib/youtube-oauth");
    const offline = vi.fn(async () => { throw new TypeError("secret-bearing network detail"); }) as unknown as typeof fetch;
    await expect(refreshYouTubeAccessToken("refresh", offline)).rejects.toMatchObject({ code: "oauth_network_failure" });
    const malformed = vi.fn(async () => Response.json({ expires_in: 3600 })) as unknown as typeof fetch;
    await expect(refreshYouTubeAccessToken("refresh", malformed)).rejects.toMatchObject({ code: "oauth_token_response_malformed" });
  });

  it("requests only the read-only YouTube scope", async () => {
    const { createYouTubeOAuthState, getYouTubeAuthorizationUrl, YOUTUBE_READONLY_SCOPE } = await import("@/lib/youtube-oauth");
    const state = createYouTubeOAuthState({ creatorId: "creator", userId: "user", nonce: "nonce", expiresAt: 2000, role:"official" });
    const url = new URL(getYouTubeAuthorizationUrl(state));
    expect(url.searchParams.get("scope")).toBe(YOUTUBE_READONLY_SCOPE);
    expect(url.searchParams.get("scope")?.split(/\s+/)).toHaveLength(1);
  });

  it("revokes server-side and treats an invalid token as already revoked", async () => {
    const { revokeGoogleToken } = await import("@/lib/youtube-oauth");
    const fetcher = vi.fn(async (url, init) => {
      expect(url).toBe("https://oauth2.googleapis.com/revoke");
      expect(init?.method).toBe("POST");
      expect(String(init?.body)).toBe("token=encrypted-value-was-decrypted-server-side");
      return new Response(null, { status: 400 });
    }) as unknown as typeof fetch;
    await expect(revokeGoogleToken("encrypted-value-was-decrypted-server-side", fetcher)).resolves.toEqual({ status: "revoked" });
  });

  it("enters a retryable pending state when Google is unavailable", async () => {
    const { revokeGoogleToken } = await import("@/lib/youtube-oauth");
    const fetcher = vi.fn(async () => new Response(null, { status: 503 })) as unknown as typeof fetch;
    await expect(revokeGoogleToken("token", fetcher)).resolves.toEqual({ status: "pending" });
  });
});

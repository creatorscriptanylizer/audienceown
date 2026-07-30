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
    const state = createYouTubeOAuthState({ creatorId: "creator", userId: "user", nonce: "nonce", expiresAt: 2000 });
    expect(verifyYouTubeOAuthState(state, "nonce", 1000)?.creatorId).toBe("creator");
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
});

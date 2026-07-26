import { describe, expect, it } from "vitest";
import { PLATFORM_IDS, PLATFORMS, getPlatform, normalizePlatformAccount, platformFromAccount, searchPlatforms } from "@/lib/platforms";

describe("platform configuration", () => {
  it("covers every selector platform exactly once", () => {
    expect(new Set(PLATFORMS.map((platform) => platform.id)).size).toBe(PLATFORM_IDS.length);
    expect(PLATFORMS.map((platform) => platform.id)).toEqual([...PLATFORM_IDS]);
  });

  it("maps every platform to a Stage 1 database value", () => {
    const databaseValues = new Set(["youtube","instagram","tiktok","x","facebook","twitch","discord","other"]);
    expect(PLATFORMS.every((platform) => databaseValues.has(platform.databaseValue))).toBe(true);
  });

  it("keeps searchable aliases and categories in the central configuration", () => {
    expect(searchPlatforms("twitter").map((platform) => platform.id)).toContain("x");
    expect(searchPlatforms("professional").map((platform) => platform.id)).toContain("linkedin");
    expect(searchPlatforms("shorts").map((platform) => platform.id)).toContain("tiktok");
  });
});

describe("platform account normalization", () => {
  it("normalizes supported handles into canonical URLs", () => {
    expect(normalizePlatformAccount("youtube", "@nanakwame")).toEqual({
      url: "https://youtube.com/@nanakwame",
      label: "@nanakwame",
    });
    expect(normalizePlatformAccount("instagram", "@nanakwame")).toEqual({
      url: "https://instagram.com/nanakwame",
      label: "@nanakwame",
    });
  });

  it("accepts valid platform HTTPS URLs", () => {
    const result = normalizePlatformAccount("twitch", "https://twitch.tv/nanakwame");
    expect(result).toMatchObject({ url: "https://twitch.tv/nanakwame" });
  });

  it("rejects unsafe protocols and malformed domains", () => {
    expect(normalizePlatformAccount("youtube", "javascript:alert(1)")).toHaveProperty("error");
    expect(normalizePlatformAccount("youtube", "data:text/html,bad")).toHaveProperty("error");
    expect(normalizePlatformAccount("youtube", "https://example.com/@nanakwame")).toHaveProperty("error");
  });

  it("does not invent handles for ambiguous platforms", () => {
    expect(normalizePlatformAccount("spotify", "@nanakwame")).toEqual({
      error: "Use a full HTTPS URL for Spotify.",
    });
  });

  it("restores extended platform identity from canonical domains", () => {
    expect(platformFromAccount("other", "https://open.spotify.com/artist/123").id).toBe("spotify");
    expect(platformFromAccount("other", "https://linkedin.com/in/nanakwame").id).toBe("linkedin");
    expect(platformFromAccount("other", "https://example.com/nana").id).toBe("more");
  });

  it("rejects values outside the central allow-list", () => {
    expect(getPlatform("javascript")).toBeUndefined();
  });
});

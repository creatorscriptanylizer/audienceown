import { describe, expect, it } from "vitest";
import { getYouTubeChannel, pollYouTubeUploads, YouTubeProviderError } from "@/lib/youtube-watcher";

function mockFetch(responses: Array<{ status?: number; body: unknown }>) {
  let index = 0;
  return (async () => {
    const response = responses[index++];
    return new Response(JSON.stringify(response.body), {
      status: response.status ?? 200, headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

describe("YouTube watcher", () => {
  it("loads the owned channel and uploads playlist", async () => {
    const channel = await getYouTubeChannel("token", mockFetch([{ body: { items: [{
      id: "channel-1", snippet: { title: "Studio" }, contentDetails: { relatedPlaylists: { uploads: "uploads-1" } },
    }] } }]));
    expect(channel).toEqual({ id: "channel-1", title: "Studio", uploadsPlaylistId: "uploads-1" });
  });

  it("normalizes a video and uses a missing thumbnail safely", async () => {
    const result = await pollYouTubeUploads("token", "uploads", null, mockFetch([
      { body: { items: [{ contentDetails: { videoId: "video-1" } }] } },
      { body: { items: [{ id: "video-1", snippet: {
        title: "Release", description: "Details", publishedAt: "2026-01-01T00:00:00Z",
        liveBroadcastContent: "none", thumbnails: {},
      }, status: { privacyStatus: "public", uploadStatus: "processed" } }] } },
    ]));
    expect(result.items[0]).toMatchObject({
      externalObjectId: "video-1", objectType: "video", eventType: "published",
      thumbnailUrl: null, canonicalUrl: "https://www.youtube.com/watch?v=video-1",
    });
  });

  it("normalizes scheduled and live content", async () => {
    const result = await pollYouTubeUploads("token", "uploads", null, mockFetch([
      { body: { items: [{ contentDetails: { videoId: "live-1" } }] } },
      { body: { items: [{ id: "live-1", snippet: { title: "Live", liveBroadcastContent: "upcoming", thumbnails: {} },
        status: { privacyStatus: "public" }, liveStreamingDetails: { scheduledStartTime: "2026-02-01T10:00:00Z" } }] } },
    ]));
    expect(result.items[0]).toMatchObject({ objectType: "livestream", eventType: "scheduled", liveStatus: "upcoming" });
  });

  it("ignores private/deleted items and stops at the cursor", async () => {
    const cursor = await pollYouTubeUploads("token", "uploads", "old", mockFetch([
      { body: { items: [{ contentDetails: { videoId: "new" } }, { contentDetails: { videoId: "old" } }] } },
      { body: { items: [{ id: "new", snippet: { title: "Private" }, status: { privacyStatus: "private" } }] } },
    ]));
    expect(cursor.items).toEqual([]);
    expect(cursor.cursor).toBe("new");
  });

  it.each([[403, "quotaExceeded", "quota"], [401, "", "unauthorized"], [500, "", "transient"]] as const)(
    "classifies provider errors", async (status, reason, code) => {
      await expect(getYouTubeChannel("token", mockFetch([{ status, body: { error: { errors: [{ reason }] } } }])))
        .rejects.toMatchObject({ code } satisfies Partial<YouTubeProviderError>);
    },
  );
});

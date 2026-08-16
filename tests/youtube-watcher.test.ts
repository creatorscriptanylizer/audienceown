import { describe, expect, it } from "vitest";
import { getYouTubeChannel, getYouTubeChannels, pollYouTubeUploads, YouTubeProviderError } from "@/lib/youtube-watcher";

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
    let requestedUrl = "";
    const fetcher = (async (input: string | URL | Request) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ items: [{
        id: "channel-1", snippet: { title: "Studio" }, contentDetails: { relatedPlaylists: { uploads: "uploads-1" } },
        statistics: { subscriberCount: "4321", hiddenSubscriberCount: false },
      }] }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    const channel = await getYouTubeChannel("token", fetcher);
    expect(new URL(requestedUrl).searchParams.get("part")).toBe("id,snippet,contentDetails,statistics");
    expect(channel).toEqual({
      id: "channel-1", title: "Studio", uploadsPlaylistId: "uploads-1",
      subscriberCount: "4321", hiddenSubscriberCount: false,
    });
  });

  it("returns zero channels without inventing an identity", async () => {
    await expect(getYouTubeChannels("token", mockFetch([{ body: { items: [] } }]))).resolves.toEqual([]);
  });

  it("returns every valid channel and follows provider pagination", async () => {
    const item = (id: string) => ({ id, snippet: { title: id }, contentDetails: { relatedPlaylists: { uploads: `uploads-${id}` } }, statistics: { subscriberCount: "12", hiddenSubscriberCount: false } });
    const requested: string[] = [];
    const responses = [{ items: [item("a")], nextPageToken: "page-2" }, { items: [item("b")] }];
    const fetcher = (async (input: string | URL | Request) => {
      requested.push(String(input));
      return Response.json(responses.shift());
    }) as typeof fetch;
    await expect(getYouTubeChannels("token", fetcher)).resolves.toMatchObject([{ id: "a" }, { id: "b" }]);
    expect(requested[0]).toContain("maxResults=50");
    expect(requested[1]).toContain("pageToken=page-2");
    await expect(getYouTubeChannel("token", mockFetch([{ body: { items: [item("a"), item("b")] } }]))).rejects.toMatchObject({ code: "malformed" });
  });

  it("rejects malformed channel records instead of making them connectable", async () => {
    await expect(getYouTubeChannels("token", mockFetch([{ body: { items: [{ id: "missing-metadata" }] } }]))).rejects.toMatchObject({ code: "malformed" });
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

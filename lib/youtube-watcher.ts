export type YouTubeContent = {
  externalObjectId: string;
  objectType: "video" | "livestream";
  eventType: "published" | "scheduled" | "live_started" | "live_completed";
  title: string;
  description: string;
  canonicalUrl: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  scheduledStartTime: string | null;
  liveStatus: "none" | "upcoming" | "live" | "completed";
};

export class YouTubeProviderError extends Error {
  constructor(public code: "quota" | "unauthorized" | "revoked" | "transient" | "malformed", message: string) {
    super(message);
  }
}

type ApiList = { items?: Array<Record<string, unknown>>; nextPageToken?: string; error?: { errors?: Array<{ reason?: string }> } };

export type YouTubeChannelIdentity = {
  id: string;
  title: string;
  uploadsPlaylistId: string;
  subscriberCount: string | null;
  hiddenSubscriberCount: boolean;
};

function providerError(status: number, body: ApiList) {
  const reason = body.error?.errors?.[0]?.reason;
  if (status === 401) return new YouTubeProviderError("unauthorized", "YouTube authorization expired.");
  if (status === 403 && reason === "quotaExceeded") return new YouTubeProviderError("quota", "YouTube API quota exhausted.");
  if (status === 403) return new YouTubeProviderError("revoked", "YouTube authorization was revoked.");
  if (status >= 500 || status === 429) return new YouTubeProviderError("transient", "YouTube is temporarily unavailable.");
  return new YouTubeProviderError("malformed", "YouTube returned an unexpected response.");
}

async function youtubeGet(path: string, accessToken: string, fetcher: typeof fetch) {
  const response = await fetcher(`https://www.googleapis.com/youtube/v3/${path}`, {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({})) as ApiList;
  if (!response.ok) throw providerError(response.status, body);
  if (!Array.isArray(body.items)) throw new YouTubeProviderError("malformed", "YouTube response is missing items.");
  return body;
}

function text(value: unknown) { return typeof value === "string" ? value : ""; }
function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }

function channelIdentity(item: Record<string, unknown>): YouTubeChannelIdentity {
  const snippet = record(item.snippet);
  const playlists = record(record(item.contentDetails).relatedPlaylists);
  const statistics = record(item.statistics);
  const id = text(item.id);
  const uploadsPlaylistId = text(playlists.uploads);
  const hiddenSubscriberCount = statistics.hiddenSubscriberCount;
  const subscriberCount = text(statistics.subscriberCount) || null;
  if (!id || !uploadsPlaylistId || typeof hiddenSubscriberCount !== "boolean" || (!hiddenSubscriberCount && !subscriberCount)) {
    throw new YouTubeProviderError("malformed", "YouTube channel metadata is incomplete.");
  }
  if (process.env.NODE_ENV === "development") {
    console.info("youtube_channel_audience", { channelId: id, channelTitle: text(snippet.title), subscriberCount, hiddenSubscriberCount });
  }
  return { id, title: text(snippet.title) || "YouTube channel", uploadsPlaylistId, subscriberCount, hiddenSubscriberCount };
}

export async function getYouTubeChannels(accessToken: string, fetcher: typeof fetch = fetch) {
  const channels: YouTubeChannelIdentity[] = [];
  let pageToken: string | undefined;
  do {
    const query = new URLSearchParams({
      part: "id,snippet,contentDetails,statistics", mine: "true", maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    });
    const body = await youtubeGet(`channels?${query}`, accessToken, fetcher);
    channels.push(...body.items!.map(channelIdentity));
    pageToken = text(body.nextPageToken) || undefined;
  } while (pageToken);
  return channels;
}

export async function getYouTubeChannel(accessToken: string, fetcher: typeof fetch = fetch) {
  const channels = await getYouTubeChannels(accessToken, fetcher);
  if (channels.length === 0) throw new YouTubeProviderError("malformed", "No YouTube channel is available for this account.");
  if (channels.length > 1) throw new YouTubeProviderError("malformed", "YouTube authorization returned multiple channels.");
  return channels[0];
}

export async function pollYouTubeUploads(
  accessToken: string, uploadsPlaylistId: string, cursor: string | null, fetcher: typeof fetch = fetch,
) {
  const list = await youtubeGet(
    `playlistItems?part=contentDetails&playlistId=${encodeURIComponent(uploadsPlaylistId)}&maxResults=10`,
    accessToken, fetcher,
  );
  const ids = list.items!.map((item) => text(record(item.contentDetails).videoId)).filter(Boolean);
  const newIds = cursor && ids.includes(cursor) ? ids.slice(0, ids.indexOf(cursor)) : ids;
  if (!newIds.length) return { items: [] as YouTubeContent[], cursor: ids[0] ?? cursor };
  const details = await youtubeGet(
    `videos?part=snippet,status,liveStreamingDetails&id=${encodeURIComponent(newIds.join(","))}`,
    accessToken, fetcher,
  );
  const items = details.items!.flatMap((item): YouTubeContent[] => {
    const id = text(item.id);
    const snippet = record(item.snippet);
    const status = record(item.status);
    if (!id || text(status.privacyStatus) !== "public" || text(status.uploadStatus) === "deleted") return [];
    const live = record(item.liveStreamingDetails);
    const broadcast = text(snippet.liveBroadcastContent);
    const actualStart = text(live.actualStartTime);
    const actualEnd = text(live.actualEndTime);
    const scheduledStart = text(live.scheduledStartTime);
    const liveStatus = actualEnd ? "completed" : actualStart ? "live" : scheduledStart || broadcast === "upcoming" ? "upcoming" : "none";
    const objectType = liveStatus === "none" ? "video" : "livestream";
    const thumbnails = record(snippet.thumbnails);
    const thumbnailUrl = ["maxres","standard","high","medium","default"]
      .map((key) => text(record(thumbnails[key]).url)).find(Boolean) ?? null;
    return [{
      externalObjectId: id, objectType,
      eventType: objectType === "video" ? "published" : liveStatus === "upcoming" ? "scheduled"
        : liveStatus === "live" ? "live_started" : "live_completed",
      title: text(snippet.title) || "New YouTube content",
      description: text(snippet.description),
      canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
      thumbnailUrl, publishedAt: text(snippet.publishedAt) || null,
      scheduledStartTime: scheduledStart || null, liveStatus,
    }];
  });
  return { items, cursor: ids[0] ?? cursor };
}

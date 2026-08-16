import type { SocialProvider } from "@/lib/social-providers/types";

export const audienceProviders = ["youtube", "instagram", "tiktok", "x", "spotify", "twitch", "linkedin", "facebook", "snapchat", "pinterest", "discord"] as const;
export type AudienceProvider = Extract<SocialProvider, typeof audienceProviders[number]>;
export const audienceUnits = ["followers", "subscribers", "members", "listeners", "connections"] as const;
export type PlatformAudienceUnit = typeof audienceUnits[number];
export const audienceMetricStatuses = ["available", "hidden", "permission_required", "review_required", "access_limited", "unsupported", "not_connected", "not_selected", "stale", "error", "not_synced"] as const;
export type PlatformAudienceMetricStatus = typeof audienceMetricStatuses[number];
export type PlatformAudienceMetric = { provider: AudienceProvider; accountCategory: string; audienceCount: number | null; audienceUnit: PlatformAudienceUnit | null; status: PlatformAudienceMetricStatus; sourceTimestamp: string | null; synchronizedAt: string | null; nextSyncAt: string | null; approximate: boolean; explanationCode: string | null };

export function normalizeAudienceCount(value: unknown): number {
  const count = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) throw new Error("invalid_audience_count");
  return count;
}

export const RECOVERY_PASS_CATEGORIES = ["videos", "livestreams", "podcasts", "products", "events", "announcements"] as const;
export type RecoveryPassCategory = typeof RECOVERY_PASS_CATEGORIES[number];

export const PROVIDER_ACTIONS: Record<string, string> = {
  youtube: "Subscribe on YouTube",
  instagram: "Follow on Instagram",
  tiktok: "Follow on TikTok",
  facebook: "Follow on Facebook",
  twitch: "Follow on Twitch",
  x: "Follow on X",
  twitter: "Follow on X",
  linkedin: "Follow on LinkedIn",
  pinterest: "Follow on Pinterest",
  discord: "Join on Discord",
};

export function providerAction(provider: string) {
  return PROVIDER_ACTIONS[provider.toLowerCase()] ?? `Open on ${provider}`;
}

export const platformPresentation: Record<string, { label: string; unit: "followers" | "subscribers" | "members" | "listeners" | null; color: string }> = {
  youtube: { label: "YouTube", unit: "subscribers", color: "#ff0033" }, instagram: { label: "Instagram", unit: "followers", color: "#e94b91" },
  tiktok: { label: "TikTok", unit: "followers", color: "#25f4ee" }, x: { label: "X", unit: "followers", color: "#f4f4f5" },
  spotify: { label: "Spotify", unit: "listeners", color: "#1ed760" }, twitch: { label: "Twitch", unit: "followers", color: "#9146ff" },
  linkedin: { label: "LinkedIn", unit: null, color: "#0a66c2" }, facebook: { label: "Facebook", unit: "followers", color: "#1877f2" },
  snapchat: { label: "Snapchat", unit: null, color: "#fffc00" },
  pinterest: { label: "Pinterest", unit: "followers", color: "#e60023" }, discord: { label: "Discord", unit: "members", color: "#5865f2" },
};

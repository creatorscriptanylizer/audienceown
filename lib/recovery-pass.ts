export const SOURCE_PLATFORMS = [
  "tiktok", "instagram", "youtube", "x", "facebook", "snapchat",
  "twitch", "linkedin", "spotify", "discord", "pinterest", "website", "direct", "other",
] as const;

export type SourcePlatform = typeof SOURCE_PLATFORMS[number];

export function normaliseSource(value: string | null | undefined): SourcePlatform {
  return SOURCE_PLATFORMS.includes(value as SourcePlatform) ? value as SourcePlatform : "direct";
}

export function recoveryPassUrl(origin: string, slug: string, source: SourcePlatform = "direct") {
  const base = `${origin.replace(/\/$/, "")}/c/${encodeURIComponent(slug)}`;
  return source === "direct" ? base : `${base}?src=${source}`;
}

export function canonicalRecoveryPassOrigin(origin: string) {
  try {
    const parsed = new URL(origin);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") return "https://audienceown.com";
    return `${parsed.protocol}//${parsed.host}`.replace(/\/$/, "");
  } catch {
    return "https://audienceown.com";
  }
}

export function canonicalRecoveryPassUrl(origin: string, slug: string) {
  return `${canonicalRecoveryPassOrigin(origin)}/${encodeURIComponent(slug)}`;
}

export function displayRecoveryPassUrl(origin: string, slug: string) {
  return canonicalRecoveryPassUrl(origin, slug).replace(/^https?:\/\/(?:www\.)?/, "");
}

export function sourceLabel(source: string | null | undefined) {
  const value = normaliseSource(source);
  if (value === "x") return "X";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), true);

const providers = [
  ["YouTube", ["GOOGLE_YOUTUBE_CLIENT_ID", "GOOGLE_YOUTUBE_CLIENT_SECRET", "GOOGLE_YOUTUBE_REDIRECT_URI", "YOUTUBE_OAUTH_STATE_SECRET"]],
  ["Instagram", ["INSTAGRAM_CLIENT_ID", "INSTAGRAM_CLIENT_SECRET", "INSTAGRAM_REDIRECT_URI"]],
  ["Facebook", ["META_APP_ID", "META_APP_SECRET", "META_REDIRECT_URI"]],
  ["TikTok", ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_REDIRECT_URI"]],
  ["X", ["X_CLIENT_ID", "X_CLIENT_SECRET", "X_REDIRECT_URI", "X_API_ACCESS_TIER"]],
  ["Twitch", ["TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET", "TWITCH_REDIRECT_URI"]],
  ["Pinterest", ["PINTEREST_APP_ID", "PINTEREST_APP_SECRET", "PINTEREST_REDIRECT_URI"]],
  ["Discord", ["DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET", "DISCORD_REDIRECT_URI"]],
  ["LinkedIn", ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET", "LINKEDIN_REDIRECT_URI"]],
  ["Spotify", ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET", "SPOTIFY_REDIRECT_URI"]],
  ["Snapchat", ["SNAPCHAT_CLIENT_ID", "SNAPCHAT_CLIENT_SECRET", "SNAPCHAT_REDIRECT_URI"]],
];

function valid(name, value) {
  if (!value || !value.trim()) return false;
  if (/^(?:changeme|replace_me|todo|your[_-].+|example[_-].+|<.+>)$/i.test(value.trim())) return false;
  if (name.endsWith("_REDIRECT_URI")) {
    try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !value.includes("*"); } catch { return false; }
  }
  if (name === "X_API_ACCESS_TIER") return value !== "unavailable" && value !== "not_configured";
  return true;
}

for (const [provider, required] of providers) {
  const values = required.map((name) => process.env[name]);
  const state = values.some((value) => value === undefined || value.length === 0)
    ? "missing"
    : required.every((name, index) => valid(name, values[index])) ? "configured" : "invalid";
  console.log(`${provider.padEnd(12)} ${state}`);
}

for (const name of ["SOCIAL_TOKEN_ENCRYPTION_KEY", "SOCIAL_OAUTH_STATE_SECRET"]) {
  const value = process.env[name];
  const state = value === undefined || value.length === 0 ? "missing" : value.trim().length === 0 ? "invalid" : "configured";
  console.log(`${name.padEnd(30)} ${state}`);
}

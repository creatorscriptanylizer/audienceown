import { socialProviders, type NormalizedSocialContent, type SocialProvider } from "./types";
export function isSocialProvider(value: string): value is SocialProvider {
  return socialProviders.includes(value as SocialProvider);
}
export function validateNormalizedContent(value: NormalizedSocialContent): NormalizedSocialContent | null {
  if (!isSocialProvider(value.provider) || !value.externalObjectId.trim()
    || !value.canonicalUrl.startsWith("https://") || !Number.isFinite(Date.parse(value.sourcePublishedAt))) return null;
  try {
    const host = new URL(value.canonicalUrl).hostname.toLowerCase();
    if(value.provider==="podcast"||value.provider==="rss")return value;
    if (!providerHosts[value.provider].some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) return null;
  } catch { return null; }
  return value;
}
export const providerHosts: Record<SocialProvider, string[]> = {
  youtube:["youtube.com","youtu.be"], instagram:["instagram.com"], tiktok:["tiktok.com"],
  x:["x.com","twitter.com"], spotify:["spotify.com"], twitch:["twitch.tv"],
  linkedin:["linkedin.com"], facebook:["facebook.com","fb.watch"], snapchat:["snapchat.com"],
  pinterest:["pinterest.com","pin.it"], discord:["discord.com","discordapp.com"],
  podcast:[],rss:[],
};

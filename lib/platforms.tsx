import type { ComponentType } from "react";
import type { IconBaseProps } from "react-icons";
import {
  FaDiscord,
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaPinterestP,
  FaSnapchat,
  FaSpotify,
  FaTiktok,
  FaTwitch,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import { Globe2 } from "lucide-react";

export const PLATFORM_IDS = [
  "youtube", "instagram", "tiktok", "x", "spotify", "twitch", "linkedin",
  "facebook", "snapchat", "pinterest", "discord", "more",
] as const;
export type PlatformId = typeof PLATFORM_IDS[number];
export type PlatformIcon = ComponentType<IconBaseProps> | typeof Globe2;

export type PlatformDefinition = {
  id: PlatformId;
  name: string;
  icon: PlatformIcon;
  brandColor: string;
  brandColorOnLight?: string;
  brandBackground: string;
  fieldLabel: string;
  placeholder: string;
  helperText: string;
  description: string;
  category: "Social" | "Video" | "Music" | "Professional" | "Community";
  aliases: readonly string[];
  databaseValue: "youtube" | "instagram" | "tiktok" | "x" | "spotify" | "twitch" | "linkedin" | "facebook" | "snapchat" | "pinterest" | "discord" | "other";
  domains: readonly string[];
  handleBaseUrl?: string;
};

export const PLATFORMS: readonly PlatformDefinition[] = [
  { id:"youtube", name:"YouTube", description:"Video channel", category:"Video", aliases:["yt","video","channel"], icon:FaYoutube, brandColor:"#ff3b3b", brandColorOnLight:"#e11d2e", brandBackground:"rgba(255,0,0,.12)", fieldLabel:"Channel URL or handle", placeholder:"https://youtube.com/@nanakwame", helperText:"Add your main YouTube channel or profile.", databaseValue:"youtube", domains:["youtube.com","www.youtube.com","youtu.be"], handleBaseUrl:"https://youtube.com/@" },
  { id:"instagram", name:"Instagram", description:"Photos & reels", category:"Social", aliases:["ig","insta","reels"], icon:FaInstagram, brandColor:"#e879f9", brandBackground:"linear-gradient(135deg,rgba(249,115,22,.18),rgba(217,70,239,.18))", fieldLabel:"Profile URL or handle", placeholder:"https://instagram.com/nanakwame", helperText:"Add your main Instagram profile.", databaseValue:"instagram", domains:["instagram.com","www.instagram.com"], handleBaseUrl:"https://instagram.com/" },
  { id:"tiktok", name:"TikTok", description:"Short-form video", category:"Video", aliases:["tt","shorts"], icon:FaTiktok, brandColor:"#f4f4f5", brandColorOnLight:"#111827", brandBackground:"linear-gradient(135deg,rgba(34,211,238,.14),rgba(244,63,94,.14))", fieldLabel:"Profile URL or handle", placeholder:"@nanakwame", helperText:"Add your main TikTok account.", databaseValue:"tiktok", domains:["tiktok.com","www.tiktok.com"], handleBaseUrl:"https://tiktok.com/@" },
  { id:"x", name:"X", description:"Posts & conversation", category:"Social", aliases:["twitter","tweets"], icon:FaXTwitter, brandColor:"#f4f4f5", brandColorOnLight:"#111827", brandBackground:"rgba(255,255,255,.08)", fieldLabel:"Profile URL or handle", placeholder:"@nanakwame", helperText:"Add your main X profile.", databaseValue:"x", domains:["x.com","www.x.com","twitter.com","www.twitter.com"], handleBaseUrl:"https://x.com/" },
  { id:"spotify", name:"Spotify", description:"Music & podcasts", category:"Music", aliases:["audio","podcast","artist"], icon:FaSpotify, brandColor:"#1ed760", brandBackground:"rgba(30,215,96,.12)", fieldLabel:"Artist or show URL", placeholder:"https://open.spotify.com/artist/…", helperText:"Add your main Spotify artist or show page.", databaseValue:"spotify", domains:["open.spotify.com"] },
  { id:"twitch", name:"Twitch", description:"Live streaming", category:"Video", aliases:["stream","gaming","live"], icon:FaTwitch, brandColor:"#a78bfa", brandBackground:"rgba(145,70,255,.14)", fieldLabel:"Channel URL or handle", placeholder:"https://twitch.tv/nanakwame", helperText:"Add your main Twitch channel.", databaseValue:"twitch", domains:["twitch.tv","www.twitch.tv"], handleBaseUrl:"https://twitch.tv/" },
  { id:"linkedin", name:"LinkedIn", description:"Professional profile", category:"Professional", aliases:["work","career","business"], icon:FaLinkedinIn, brandColor:"#60a5fa", brandColorOnLight:"#0a66c2", brandBackground:"rgba(10,102,194,.14)", fieldLabel:"Profile or page URL", placeholder:"https://linkedin.com/in/nanakwame", helperText:"Add your main LinkedIn profile or page.", databaseValue:"linkedin", domains:["linkedin.com","www.linkedin.com"] },
  { id:"facebook", name:"Facebook", description:"Page or profile", category:"Social", aliases:["fb","meta"], icon:FaFacebookF, brandColor:"#60a5fa", brandColorOnLight:"#1877f2", brandBackground:"rgba(24,119,242,.14)", fieldLabel:"Profile URL or handle", placeholder:"https://facebook.com/nanakwame", helperText:"Add your main Facebook page or profile.", databaseValue:"facebook", domains:["facebook.com","www.facebook.com","fb.com"], handleBaseUrl:"https://facebook.com/" },
  { id:"snapchat", name:"Snapchat", description:"Stories & moments", category:"Social", aliases:["snap","stories"], icon:FaSnapchat, brandColor:"#fde047", brandColorOnLight:"#171717", brandBackground:"rgba(255,252,0,.18)", fieldLabel:"Profile URL or handle", placeholder:"@nanakwame", helperText:"Add your main Snapchat profile.", databaseValue:"snapchat", domains:["snapchat.com","www.snapchat.com"], handleBaseUrl:"https://snapchat.com/add/" },
  { id:"pinterest", name:"Pinterest", description:"Ideas & inspiration", category:"Social", aliases:["pins","boards"], icon:FaPinterestP, brandColor:"#f43f5e", brandBackground:"rgba(230,0,35,.12)", fieldLabel:"Profile URL or handle", placeholder:"https://pinterest.com/nanakwame", helperText:"Add your main Pinterest profile.", databaseValue:"pinterest", domains:["pinterest.com","www.pinterest.com"], handleBaseUrl:"https://pinterest.com/" },
  { id:"discord", name:"Discord", description:"Community server", category:"Community", aliases:["server","chat","gaming"], icon:FaDiscord, brandColor:"#818cf8", brandBackground:"rgba(88,101,242,.14)", fieldLabel:"Invite or community URL", placeholder:"https://discord.gg/yourcommunity", helperText:"Add your official Discord community.", databaseValue:"discord", domains:["discord.gg","discord.com","www.discord.com"] },
  { id:"more", name:"More platforms", description:"Add another service", category:"Community", aliases:["other","website","custom"], icon:Globe2, brandColor:"#a78bfa", brandBackground:"rgba(139,92,246,.1)", fieldLabel:"Account URL", placeholder:"https://example.com/yourprofile", helperText:"Add another official place where fans can find you.", databaseValue:"other", domains:[] },
] as const;

export function getPlatform(id: string) {
  return PLATFORMS.find((platform) => platform.id === id);
}

export function searchPlatforms(query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return [...PLATFORMS];
  return PLATFORMS.filter((platform) =>
    [platform.name, platform.category, ...platform.aliases].some((value) => value.toLowerCase().includes(term)),
  );
}

export function platformFromAccount(platform: string, url: string): PlatformDefinition {
  if (platform !== "other") return getPlatform(platform) ?? PLATFORMS.at(-1)!;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return PLATFORMS.find((item) => item.domains.includes(hostname)) ?? PLATFORMS.at(-1)!;
  } catch {
    return PLATFORMS.at(-1)!;
  }
}

export type NormalizedPlatformAccount = { url: string; label: string } | { error: string };

export function normalizePlatformAccount(platformId: PlatformId, input: string): NormalizedPlatformAccount {
  const platform = getPlatform(platformId);
  if (!platform) return { error: "Choose a supported platform." } as const;
  const value = input.trim();
  if (value.startsWith("@")) {
    const handle = value.slice(1);
    if (!platform.handleBaseUrl) return { error: `Use a full HTTPS URL for ${platform.name}.` } as const;
    if (!/^[A-Za-z0-9._-]{1,80}$/.test(handle)) return { error: "Enter a valid handle." } as const;
    return { url: `${platform.handleBaseUrl}${handle}`, label: `@${handle}` } as const;
  }
  let parsed: URL;
  try { parsed = new URL(value); } catch { return { error: "Enter a full HTTPS URL or supported @handle." } as const; }
  if (parsed.protocol !== "https:") return { error: "Only secure HTTPS links are accepted." } as const;
  if (platform.domains.length && !platform.domains.includes(parsed.hostname.toLowerCase()))
    return { error: `Use a ${platform.name} URL.` } as const;
  const lastPart = parsed.pathname.split("/").filter(Boolean).at(-1);
  return { url: parsed.toString(), label: lastPart ? (lastPart.startsWith("@") ? lastPart : `@${lastPart}`) : platform.name } as const;
}

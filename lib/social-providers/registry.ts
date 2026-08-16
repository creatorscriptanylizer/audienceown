import type { SocialProvider, SocialProviderAdapter } from "./types";
import { youtubeProvider } from "./providers/youtube"; import { instagramProvider } from "./providers/instagram";
import { tiktokProvider } from "./providers/tiktok"; import { xProvider } from "./providers/x";
import { spotifyProvider } from "./providers/spotify"; import { twitchProvider } from "./providers/twitch";
import { linkedinProvider } from "./providers/linkedin"; import { facebookProvider } from "./providers/facebook";
import { snapchatProvider } from "./providers/snapchat";
import { pinterestProvider } from "./providers/pinterest"; import { discordProvider } from "./providers/discord";
import{podcastProvider,rssProvider}from"./providers/feed";
import { oauthFoundationProviders, providerRegistryEntry } from "./provider-registry";
const adapters: SocialProviderAdapter[]=[youtubeProvider,instagramProvider,tiktokProvider,xProvider,spotifyProvider,twitchProvider,linkedinProvider,facebookProvider,snapchatProvider,pinterestProvider,discordProvider,podcastProvider,rssProvider];
const registry=new Map(adapters.map((adapter)=>[adapter.provider,adapter]));
export function getSocialProvider(provider: SocialProvider){return registry.get(provider)!;}
export function listSocialProviders(){return [...adapters];}
export function listOAuthProviderRegistry(){return oauthFoundationProviders.map(provider=>providerRegistryEntry(provider,getSocialProvider(provider)));}

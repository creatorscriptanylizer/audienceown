import type { SocialProvider, SocialProviderAdapter } from "./types";
import { providerAudienceCapabilities } from "@/lib/platform-audience/capabilities";

export type ProviderConfigurationState="configured"|"missing"|"invalid";
export type ProviderRegistryEntry={
  id:Exclude<SocialProvider,"podcast"|"rss">;displayName:string;description:string;icon:string;
  oauthImplemented:boolean;connectPath:string|null;audienceMetricSupported:boolean;assetSelectionSupported:boolean;
  refreshSupported:boolean;disconnectSupported:boolean;configuration:ProviderConfigurationState;missingConfiguration:string[];
};

const definitions={
  youtube:["YouTube","Video channel","youtube",["GOOGLE_YOUTUBE_CLIENT_ID","GOOGLE_YOUTUBE_CLIENT_SECRET","GOOGLE_YOUTUBE_REDIRECT_URI","YOUTUBE_OAUTH_STATE_SECRET"]],
  instagram:["Instagram","Photos & reels","instagram",["INSTAGRAM_CLIENT_ID","INSTAGRAM_CLIENT_SECRET","INSTAGRAM_REDIRECT_URI"]],
  facebook:["Facebook","Page","facebook",["META_APP_ID","META_APP_SECRET","META_REDIRECT_URI"]],
  tiktok:["TikTok","Short-form video","tiktok",["TIKTOK_CLIENT_KEY","TIKTOK_CLIENT_SECRET","TIKTOK_REDIRECT_URI"]],
  x:["X","Posts & conversation","x",["X_CLIENT_ID","X_CLIENT_SECRET","X_REDIRECT_URI"]],
  spotify:["Spotify","Music & podcasts","spotify",["SPOTIFY_CLIENT_ID","SPOTIFY_CLIENT_SECRET","SPOTIFY_REDIRECT_URI"]],
  twitch:["Twitch","Live streaming","twitch",["TWITCH_CLIENT_ID","TWITCH_CLIENT_SECRET","TWITCH_REDIRECT_URI"]],
  linkedin:["LinkedIn","Professional profile","linkedin",["LINKEDIN_CLIENT_ID","LINKEDIN_CLIENT_SECRET","LINKEDIN_REDIRECT_URI"]],
  snapchat:["Snapchat","Stories & moments","snapchat",["SNAPCHAT_CLIENT_ID","SNAPCHAT_CLIENT_SECRET","SNAPCHAT_REDIRECT_URI"]],
  pinterest:["Pinterest","Ideas & inspiration","pinterest",["PINTEREST_APP_ID","PINTEREST_APP_SECRET","PINTEREST_REDIRECT_URI"]],
  discord:["Discord","Community server","discord",["DISCORD_CLIENT_ID","DISCORD_CLIENT_SECRET","DISCORD_REDIRECT_URI"]],
} as const;
export const oauthFoundationProviders=Object.keys(definitions) as Array<keyof typeof definitions>;

function configuration(provider:keyof typeof definitions,required:readonly string[]):{configuration:ProviderConfigurationState;missingConfiguration:string[]}{
  const placeholder=(value:string|undefined)=>!value||!value.trim()||/^(?:changeme|replace_me|todo|your[_-].+|example[_-].+|<.+>)$/i.test(value.trim());
  const missingConfiguration=required.filter(name=>placeholder(process.env[name]));if(missingConfiguration.length)return{configuration:"missing",missingConfiguration};
  const redirect=required.find(name=>name.endsWith("REDIRECT_URI"));if(redirect){try{const value=new URL(process.env[redirect]!);const loopback=value.hostname==="127.0.0.1"||value.hostname==="[::1]",invalid=provider==="tiktok"||provider==="linkedin"?value.protocol!=="https:":provider==="x"||provider==="spotify"?value.protocol!=="https:"&&!(value.protocol==="http:"&&loopback):value.protocol!=="https:"&&value.hostname!=="localhost";if(invalid)return{configuration:"invalid",missingConfiguration:[]};}catch{return{configuration:"invalid",missingConfiguration:[]};}}
  return{configuration:"configured",missingConfiguration:[]};
}

export function providerRegistryEntry(provider:keyof typeof definitions,adapter:SocialProviderAdapter):ProviderRegistryEntry{
  const [displayName,description,icon,required]=definitions[provider],state=configuration(provider,required),oauthImplemented=["youtube","instagram","facebook","tiktok","x","spotify","twitch","linkedin","pinterest","discord","snapchat"].includes(provider);
  const audience=providerAudienceCapabilities[provider];
  const connectPath=oauthImplemented?`/api/integrations/${provider}/connect`:null;
  return{id:provider,displayName,description,icon,oauthImplemented,connectPath,
    audienceMetricSupported:audience.supported,assetSelectionSupported:Boolean(adapter.discoverAssets)||audience.requiresSelectedAsset,
    refreshSupported:oauthImplemented&&adapter.capabilities.tokenRefresh,disconnectSupported:oauthImplemented&&adapter.capabilities.tokenRevocation,
    ...state};
}

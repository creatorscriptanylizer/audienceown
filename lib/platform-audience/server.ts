import "server-only";
import { z } from "zod";
import { decryptSocialSecret } from "@/lib/social-secrets";
import { providerAudienceCapabilities } from "./capabilities";
import { normalizeProviderAudience } from "./normalize";
import type { AudienceProvider, PlatformAudienceMetricStatus } from "./types";

type MetricSource = { provider:AudienceProvider; accessToken:string; stableId:string };
async function providerJson(source:MetricSource):Promise<unknown>{
 const h={Authorization:`Bearer ${source.accessToken}`};
 const urls:Partial<Record<AudienceProvider,string>>={youtube:"https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true",tiktok:"https://open.tiktokapis.com/v2/user/info/?fields=follower_count",twitch:`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${encodeURIComponent(source.stableId)}&first=1`,spotify:`https://api.spotify.com/v1/artists/${encodeURIComponent(source.stableId)}`,instagram:`https://graph.facebook.com/v23.0/${encodeURIComponent(source.stableId)}?fields=followers_count`,facebook:`https://graph.facebook.com/v23.0/${encodeURIComponent(source.stableId)}?fields=followers_count`,x:`https://api.x.com/2/users/${encodeURIComponent(source.stableId)}?user.fields=public_metrics`,pinterest:"https://api.pinterest.com/v5/user_account"};
 if(source.provider==="discord"){const response=await fetch(`https://discord.com/api/v10/guilds/${encodeURIComponent(source.stableId)}?with_counts=true`,{headers:{Authorization:`Bot ${process.env.DISCORD_BOT_TOKEN??""}`},signal:AbortSignal.timeout(10_000)});if(!response.ok)throw new Error(`provider_http_${response.status}`);return response.json();}
 const url=urls[source.provider];if(!url)throw new Error("provider_metric_unsupported");
 const headers=source.provider==="twitch"?{...h,"Client-Id":process.env.TWITCH_CLIENT_ID??""}:h;
 const response=await fetch(url,{headers,signal:AbortSignal.timeout(10_000)});if(!response.ok)throw new Error(`provider_http_${response.status}`);return response.json();
}
export async function fetchProviderAudienceMetric(source:MetricSource){return normalizeProviderAudience(source.provider,await providerJson(source));}
export function safeMetricError(error:unknown):{status:PlatformAudienceMetricStatus;code:string}{const message=error instanceof Error?error.message:"";if(message.includes("401"))return{status:"permission_required",code:"authorization_revoked"};if(message.includes("403"))return{status:"access_limited",code:"provider_access_denied"};if(message.includes("429"))return{status:"error",code:"provider_rate_limited"};if(error instanceof z.ZodError)return{status:"error",code:"invalid_provider_response"};return{status:"error",code:"provider_unavailable"};}
export function decryptMetricCredential(ciphertext:string){return decryptSocialSecret(ciphertext);}
export function nextAudienceSync(provider:AudienceProvider,attempt=0){const minimum=providerAudienceCapabilities[provider].minimumSyncMinutes;return new Date(Date.now()+minimum*60_000*Math.min(4,2**attempt)).toISOString();}

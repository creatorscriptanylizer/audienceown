import "server-only";
import { z } from "zod";
import { decryptSocialSecret } from "@/lib/social-secrets";
import { providerAudienceCapabilities } from "./capabilities";
import { normalizeProviderAudience } from "./normalize";
import type { AudienceProvider, PlatformAudienceMetricStatus } from "./types";
import { normalizeProviderFailure } from "@/lib/social-providers/errors";

type MetricSource = { provider:AudienceProvider; accessToken:string; stableId:string; loginMethod?:"instagram_login"|"facebook_login" };
async function providerJson(source:MetricSource):Promise<unknown>{
 const h={Authorization:`Bearer ${source.accessToken}`};
 const instagramHost=source.loginMethod==="facebook_login"?"graph.facebook.com":"graph.instagram.com",instagramVersion=source.loginMethod==="facebook_login"?(process.env.META_GRAPH_API_VERSION??"v26.0"):(process.env.INSTAGRAM_GRAPH_API_VERSION??"v23.0"),facebookVersion=process.env.META_GRAPH_API_VERSION??"v26.0";
 const urls:Partial<Record<AudienceProvider,string>>={youtube:"https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true",tiktok:"https://open.tiktokapis.com/v2/user/info/?fields=follower_count",twitch:`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${encodeURIComponent(source.stableId)}&first=1`,spotify:`https://api.spotify.com/v1/artists/${encodeURIComponent(source.stableId)}`,instagram:`https://${instagramHost}/${instagramVersion}/${encodeURIComponent(source.stableId)}?fields=followers_count`,facebook:`https://graph.facebook.com/${facebookVersion}/${encodeURIComponent(source.stableId)}?fields=followers_count`,x:`https://api.x.com/2/users/${encodeURIComponent(source.stableId)}?user.fields=public_metrics`,linkedin:`https://api.linkedin.com/rest/networkSizes/${encodeURIComponent(source.stableId)}?edgeType=COMPANY_FOLLOWED_BY_MEMBER`,pinterest:"https://api.pinterest.com/v5/user_account"};
 if(source.provider==="discord"){const response=await fetch("https://discord.com/api/v10/users/@me/guilds?limit=200&with_counts=true",{headers:h,signal:AbortSignal.timeout(10_000)});if(!response.ok)throw new Error(`provider_http_${response.status}`);const guilds=z.array(z.object({id:z.string(),approximate_member_count:z.number().int().nonnegative().nullable().optional()})).parse(await response.json()),guild=guilds.find(item=>item.id===source.stableId);if(!guild)throw new Error("provider_access_denied");return guild;}
 const url=urls[source.provider];if(!url)throw new Error("provider_metric_unsupported");
 const headers=source.provider==="twitch"?{...h,"Client-Id":process.env.TWITCH_CLIENT_ID??""}:source.provider==="linkedin"?{...h,"LinkedIn-Version":process.env.LINKEDIN_API_VERSION??"202603","X-Restli-Protocol-Version":"2.0.0"}:h;
 const response=await fetch(url,{headers,signal:AbortSignal.timeout(10_000)});if(!response.ok)throw new Error(`provider_http_${response.status}`);return response.json();
}
export async function fetchProviderAudienceMetric(source:MetricSource){return normalizeProviderAudience(source.provider,await providerJson(source));}
export function safeMetricError(error:unknown):{status:PlatformAudienceMetricStatus;code:string}{const failure=normalizeProviderFailure(error),message=error instanceof Error?error.message:"";if(failure.reconnectRequired||message.includes("401"))return{status:"permission_required",code:"authorization_revoked"};if(message.includes("403"))return{status:"access_limited",code:"provider_access_denied"};if(failure.category==="rate_limit"||message.includes("429"))return{status:"error",code:"provider_rate_limited"};if(failure.category==="invalid_response"||error instanceof z.ZodError)return{status:"error",code:"invalid_provider_response"};return{status:"error",code:"provider_unavailable"};}
export function decryptMetricCredential(ciphertext:string){return decryptSocialSecret(ciphertext);}
export function nextAudienceSync(provider:AudienceProvider,attempt=0){const minimum=providerAudienceCapabilities[provider].minimumSyncMinutes;return new Date(Date.now()+minimum*60_000*Math.min(4,2**attempt)).toISOString();}

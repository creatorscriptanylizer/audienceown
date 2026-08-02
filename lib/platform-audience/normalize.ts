import { z } from "zod";
import { normalizeAudienceCount, type AudienceProvider, type PlatformAudienceMetricStatus } from "./types";

const schemas = {
 youtube:z.object({items:z.array(z.object({statistics:z.object({subscriberCount:z.string().regex(/^\d+$/).optional(),hiddenSubscriberCount:z.boolean()})})).min(1)}),
 tiktok:z.object({data:z.object({user:z.object({follower_count:z.number().int().nonnegative()})}),error:z.object({code:z.string()})}),
 twitch:z.object({total:z.number().int().nonnegative()}),
 discord:z.object({approximate_member_count:z.number().int().nonnegative()}),
 spotify:z.object({followers:z.object({total:z.number().int().nonnegative()})}),
 instagram:z.object({followers_count:z.number().int().nonnegative()}), facebook:z.object({followers_count:z.number().int().nonnegative()}), pinterest:z.object({follower_count:z.number().int().nonnegative()}),
 x:z.object({data:z.object({public_metrics:z.object({followers_count:z.number().int().nonnegative()})})}),
 linkedin:z.object({elements:z.array(z.object({followerCounts:z.object({organicFollowerCount:z.number().int().nonnegative(),paidFollowerCount:z.number().int().nonnegative()})})).min(1)}),
} as const;
export type NormalizedProviderMetric = { count:number|null; status:PlatformAudienceMetricStatus; approximate:boolean };
export function normalizeProviderAudience(provider: AudienceProvider, value: unknown): NormalizedProviderMetric {
 if(provider==="youtube"){const p=schemas.youtube.parse(value).items[0].statistics;if(p.hiddenSubscriberCount)return{count:null,status:"hidden",approximate:true};return{count:normalizeAudienceCount(p.subscriberCount),status:"available",approximate:true};}
 if(provider==="tiktok")return{count:normalizeAudienceCount(schemas.tiktok.parse(value).data.user.follower_count),status:"available",approximate:false};
 if(provider==="twitch")return{count:normalizeAudienceCount(schemas.twitch.parse(value).total),status:"available",approximate:false};
 if(provider==="discord")return{count:normalizeAudienceCount(schemas.discord.parse(value).approximate_member_count),status:"available",approximate:true};
 if(provider==="spotify")return{count:normalizeAudienceCount(schemas.spotify.parse(value).followers.total),status:"available",approximate:false};
 if(provider==="instagram"||provider==="facebook")return{count:normalizeAudienceCount(schemas[provider].parse(value).followers_count),status:"available",approximate:false};
 if(provider==="pinterest")return{count:normalizeAudienceCount(schemas.pinterest.parse(value).follower_count),status:"available",approximate:false};
 if(provider==="x")return{count:normalizeAudienceCount(schemas.x.parse(value).data.public_metrics.followers_count),status:"available",approximate:false};
 if(provider==="linkedin"){const p=schemas.linkedin.parse(value).elements[0].followerCounts;return{count:normalizeAudienceCount(p.organicFollowerCount+p.paidFollowerCount),status:"available",approximate:false};}
 throw new Error("provider_metric_unsupported");
}

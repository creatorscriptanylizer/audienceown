import { z } from "zod";
import type { NormalizedSocialContent, ProviderReviewStatus, SocialProvider } from "@/lib/social-providers/types";

const hosts:Record<"tiktok"|"instagram"|"facebook",readonly string[]>={
  tiktok:["tiktok.com","www.tiktok.com","m.tiktok.com"],
  instagram:["instagram.com","www.instagram.com"],
  facebook:["facebook.com","www.facebook.com","m.facebook.com"],
};
export function canonicalProviderUrl(provider:keyof typeof hosts,value:string){
  let url:URL;try{url=new URL(value);}catch{return null;}
  if(url.protocol!=="https:"||!hosts[provider].includes(url.hostname.toLowerCase())||url.username||url.password)return null;
  url.hash="";return url;
}
const manualSchema=z.object({url:z.string().url(),title:z.string().trim().min(1).max(300),publishedAt:z.string().datetime()}).strict();
export function manualProviderContent(provider:"tiktok"|"instagram"|"facebook",value:unknown):NormalizedSocialContent|null{
  const parsed=manualSchema.safeParse(value);if(!parsed.success)return null;
  const url=canonicalProviderUrl(provider,parsed.data.url);if(!url)return null;
  const path=url.pathname.replace(/\/+$/,"");
  const valid=provider==="tiktok"?/^\/@[^/]+\/video\/\d+$/.test(path):provider==="instagram"?/^\/(p|reel)\/[A-Za-z0-9_-]+$/.test(path):/^\/(?:[^/]+\/posts\/[^/]+|[^/]+\/videos\/\d+|permalink\.php)$/.test(path);
  if(!valid)return null;
  return{provider,externalObjectId:`manual:${url.toString()}`,objectType:provider==="instagram"?"post":"video",eventType:"published",title:parsed.data.title,description:null,canonicalUrl:url.toString(),thumbnailUrl:null,mediaUrls:[],sourcePublishedAt:parsed.data.publishedAt,scheduledStartAt:null,liveStatus:null,rawMetadata:{source:"manual_import",approvalRequired:true,automaticPublishing:false,ownershipEstablished:false,trustEligible:false}};
}
export function reviewStatus(value:string|undefined):ProviderReviewStatus{
  return value==="approved"||value==="submitted"||value==="restricted"||value==="rejected"?value:value==="required"?"required":"not_configured";
}
export function classifyExpansionTwoError(error:unknown){const message=error instanceof Error?error.message:"";const code=message.includes("429")||message.includes("rate")?"rate_limited":message.includes("revoked")?"authentication_revoked":message.includes("expired")?"token_expired":message.includes("scope")?"scope_not_granted":message.includes("permission")?"permission_not_granted":message.includes("professional")?"account_not_professional":message.includes("stable")?"stable_identity_conflict":"temporary_provider_failure";return{code,retryable:["rate_limited","temporary_provider_failure","token_expired"].includes(code)};}
export function assertProvider(value:string):asserts value is SocialProvider{if(!["tiktok","instagram","facebook"].includes(value))throw new Error("unsupported_provider");}

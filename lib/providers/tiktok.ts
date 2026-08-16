import { z } from "zod";
import { SocialProviderError } from "@/lib/social-providers/errors";
import type { NormalizedSocialContent, ProviderIdentity, ProviderPollResult, ProviderTokenSet } from "@/lib/social-providers/types";
import { canonicalProviderUrl } from "./provider-expansion-two";
import { debugLog } from "@/lib/debug";

const tokenSchema = z.object({
  access_token:z.string().min(1), refresh_token:z.string().min(1).optional(), expires_in:z.number().int().positive(),
  refresh_expires_in:z.number().int().positive(), open_id:z.string().min(1), scope:z.string(), token_type:z.string().default("Bearer"),
});
const TikTokUserInfoEnvelope=z.object({data:z.object({user:z.unknown()})}).passthrough();
const TikTokCoreIdentity=z.object({open_id:z.string().trim().min(1)});
const optionalString=z.string().nullable().optional().catch(undefined),optionalBoolean=z.boolean().nullable().optional().catch(undefined),optionalStat=z.number().int().nonnegative().nullable().optional().catch(undefined);
const TikTokOptionalProfile=z.object({union_id:optionalString,username:optionalString,display_name:optionalString,avatar_url:optionalString,profile_deep_link:optionalString,bio_description:optionalString,is_verified:optionalBoolean}).passthrough();
const TikTokOptionalStats=z.object({follower_count:optionalStat,following_count:optionalStat,likes_count:optionalStat,video_count:optionalStat}).passthrough();
const videoSchema=z.object({id:z.string().min(1),create_time:z.number().int().positive(),share_url:z.string().url(),title:z.string().optional(),video_description:z.string().optional(),embed_link:z.string().url().optional(),cover_image_url:z.string().url().optional(),duration:z.number().nonnegative().optional(),height:z.number().positive().optional(),width:z.number().positive().optional()});
const videosSchema=z.object({data:z.object({videos:z.array(videoSchema),cursor:z.number().int().nonnegative().optional(),has_more:z.boolean().optional()}),error:z.object({code:z.string(),message:z.string().optional(),log_id:z.string().optional()})});

type TikTokOAuthError={error?:unknown;error_description?:unknown;log_id?:unknown};
function oauthFailure(status:number,value:TikTokOAuthError,operation:"exchange"|"refresh"){
  const providerCode=typeof value.error==="string"?value.error:"unknown";
  const retryable=status===429||status>=500||providerCode==="server_error"||providerCode==="temporarily_unavailable";
  const error=new SocialProviderError(providerCode==="invalid_grant"?"invalid_grant":status===429?"rate_limited":retryable?"transient":"malformed_provider_object","tiktok",operation==="refresh"?"TikTok token refresh failed.":"TikTok authorization exchange failed.");
  Object.assign(error,{providerCode,httpStatus:status,providerLogId:typeof value.log_id==="string"?value.log_id:undefined});
  return error;
}
function tokenSet(value:z.infer<typeof tokenSchema>):ProviderTokenSet{
  return{
    accessToken:value.access_token, refreshToken:value.refresh_token??null,
    expiresAt:new Date(Date.now()+value.expires_in*1000).toISOString(),
    refreshTokenExpiresAt:new Date(Date.now()+value.refresh_expires_in*1000).toISOString(),
    scopes:value.scope.split(",").map(scope=>scope.trim()).filter(Boolean),
    grantedScopes:value.scope.split(",").map(scope=>scope.trim()).filter(Boolean),
    tokenType:value.token_type, stableIdentityId:value.open_id,
  };
}
async function tokenRequest(body:URLSearchParams,operation:"exchange"|"refresh"){
  const response=await fetch("https://open.tiktokapis.com/v2/oauth/token/",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded","cache-control":"no-cache"},body,cache:"no-store"});
  const raw=await response.json().catch(()=>({})) as TikTokOAuthError;
  if(!response.ok||typeof raw.error==="string")throw oauthFailure(response.status,raw,operation);
  const parsed=tokenSchema.safeParse(raw);if(!parsed.success||operation==="exchange"&&!parsed.data.refresh_token)throw new SocialProviderError("malformed_provider_object","tiktok","TikTok returned an incomplete token response.");
  const result=tokenSet(parsed.data);debugLog("oauth",{event:operation==="exchange"?"tiktok_token_exchange":"tiktok_token_refresh",httpStatus:response.status,grantedScopes:result.grantedScopes,accessTokenPresent:true,refreshTokenPresent:Boolean(result.refreshToken),stableIdentityPresent:Boolean(result.stableIdentityId)});return result;
}
async function tiktok(path:string,accessToken:string,init?:RequestInit,onResponse?:(value:unknown,httpStatus:number)=>void){
  const response=await fetch(`https://open.tiktokapis.com/v2/${path}`,{...init,headers:{authorization:`Bearer ${accessToken}`,accept:"application/json",...init?.headers},cache:"no-store"});
  const value=await response.json().catch(()=>({})) as {error?:{code?:unknown;log_id?:string}};
  onResponse?.(value,response.status);
  const providerCode=value.error?.code;
  const providerSucceeded=providerCode===undefined||providerCode===null||providerCode===""||providerCode==="ok"||providerCode===0;
  if(!response.ok||!providerSucceeded){
    const code=response.status===401||providerCode==="access_token_invalid"?"access_revoked":response.status===429||providerCode==="rate_limit_exceeded"?"rate_limited":response.status>=500?"transient":"malformed_provider_object";
    const error=new SocialProviderError(code,"tiktok","TikTok API request failed.");Object.assign(error,{providerCode:typeof providerCode==="string"||typeof providerCode==="number"?providerCode:undefined,httpStatus:response.status,providerLogId:value.error?.log_id});throw error;
  }
  return value;
}
export async function exchangeTikTokCode(code:string):Promise<ProviderTokenSet>{
  const key=process.env.TIKTOK_CLIENT_KEY,secret=process.env.TIKTOK_CLIENT_SECRET,redirect=process.env.TIKTOK_REDIRECT_URI;
  if(!key||!secret||!redirect)throw new SocialProviderError("provider_not_configured","tiktok","TikTok credentials are unavailable.");
  return tokenRequest(new URLSearchParams({client_key:key,client_secret:secret,code,grant_type:"authorization_code",redirect_uri:redirect}),"exchange");
}
export async function refreshTikTokToken(refreshToken:string):Promise<ProviderTokenSet>{
  const key=process.env.TIKTOK_CLIENT_KEY,secret=process.env.TIKTOK_CLIENT_SECRET;
  if(!key||!secret)throw new SocialProviderError("provider_not_configured","tiktok","TikTok credentials are unavailable.");
  return tokenRequest(new URLSearchParams({client_key:key,client_secret:secret,grant_type:"refresh_token",refresh_token:refreshToken}),"refresh");
}
export async function revokeTikTokToken(accessToken:string){
  const key=process.env.TIKTOK_CLIENT_KEY,secret=process.env.TIKTOK_CLIENT_SECRET;
  if(!key||!secret)throw new SocialProviderError("provider_not_configured","tiktok","TikTok credentials are unavailable.");
  const response=await fetch("https://open.tiktokapis.com/v2/oauth/revoke/",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded","cache-control":"no-cache"},body:new URLSearchParams({client_key:key,client_secret:secret,token:accessToken}),cache:"no-store"});
  const value=await response.json().catch(()=>({})) as TikTokOAuthError;
  if(!response.ok||typeof value.error==="string")throw oauthFailure(response.status,value,"refresh");
}
export async function fetchTikTokIdentity(accessToken:string,options:{expectedOpenId?:string;grantedScopes?:string[]}={}):Promise<ProviderIdentity>{
  const scopes=new Set(options.grantedScopes??["user.info.basic","user.info.profile","user.info.stats"]),fields=["open_id","union_id","display_name","avatar_url",...(scopes.has("user.info.profile")?["bio_description","profile_deep_link","username","is_verified"]:[]),...(scopes.has("user.info.stats")?["follower_count"]:[])];
  const raw=await tiktok(`user/info/?fields=${fields.join(",")}`,accessToken,undefined,(value,httpStatus)=>{
    const object=value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null;
    const data=object?.data,dataObject=data&&typeof data==="object"&&!Array.isArray(data)?data as Record<string,unknown>:null;
    const user=dataObject?.user,userObject=user&&typeof user==="object"&&!Array.isArray(user)?user as Record<string,unknown>:null;
    const error=object?.error,errorObject=error&&typeof error==="object"&&!Array.isArray(error)?error as Record<string,unknown>:null;
    const fieldShape=(key:string)=>({present:Boolean(userObject&&Object.prototype.hasOwnProperty.call(userObject,key)),type:userObject?Array.isArray(userObject[key])?"array":typeof userObject[key]:"undefined"}),errorCodePresent=Boolean(errorObject&&Object.prototype.hasOwnProperty.call(errorObject,"code"));
    const openId=fieldShape("open_id"),displayName=fieldShape("display_name"),username=fieldShape("username"),followerCount=fieldShape("follower_count");
    debugLog("oauth",{event:"tiktok_identity_response_shape",httpStatus,topLevelKeys:object?Object.keys(object).sort():[],dataPresent:Boolean(data),dataType:Array.isArray(data)?"array":typeof data,dataKeys:dataObject?Object.keys(dataObject).sort():[],userPresent:Boolean(user),userType:Array.isArray(user)?"array":typeof user,userKeys:userObject?Object.keys(userObject).sort():[],openIdPresent:openId.present,openIdType:openId.type,displayNamePresent:displayName.present,displayNameType:displayName.type,usernamePresent:username.present,usernameType:username.type,followerCountPresent:followerCount.present,followerCountType:followerCount.type,errorPresent:Boolean(error),errorKeys:errorObject?Object.keys(errorObject).sort():[],errorCodePresent,errorCodeType:errorObject?Array.isArray(errorObject.code)?"array":typeof errorObject.code:"undefined"});
  });
  const envelope=TikTokUserInfoEnvelope.safeParse(raw);
  if(!envelope.success)throw new SocialProviderError("malformed_provider_object","tiktok","TikTok returned an invalid profile identity.");
  const core=TikTokCoreIdentity.safeParse(envelope.data.data.user);
  if(!core.success)throw new SocialProviderError("malformed_provider_object","tiktok","TikTok returned an invalid profile identity.");
  const profile=TikTokOptionalProfile.safeParse(envelope.data.data.user),stats=TikTokOptionalStats.safeParse(envelope.data.data.user);
  const user={...core.data,...(profile.success?profile.data:{}),...(stats.success?stats.data:{})};
  if(options.expectedOpenId&&options.expectedOpenId!==user.open_id){debugLog("oauth",{event:"tiktok_identity_binding",identityMatch:false});throw new SocialProviderError("tiktok_identity_mismatch","tiktok","TikTok identity could not be securely bound.");}
  const fallback=user.username?`https://www.tiktok.com/@${encodeURIComponent(user.username)}`:"https://www.tiktok.com/",url=(user.profile_deep_link?canonicalProviderUrl("tiktok",user.profile_deep_link):null)??canonicalProviderUrl("tiktok",fallback);
  if(!url)throw new SocialProviderError("malformed_provider_object","tiktok","TikTok returned an invalid profile identity.");
  debugLog("oauth",{event:"tiktok_identity_fetch",requestedFields:fields,usernamePresent:Boolean(user.username),avatarPresent:Boolean(user.avatar_url),profileUrlPresent:Boolean(user.profile_deep_link)});debugLog("oauth",{event:"tiktok_identity_binding",identityMatch:true});
  const displayName=user.display_name??user.username??"TikTok creator";
  return{externalAccountId:user.open_id,displayName,username:user.username??null,profileUrl:url.toString(),avatarUrl:user.avatar_url??null,metadata:{handle:user.username??null,avatarUrl:user.avatar_url??null,bioDescription:user.bio_description??null,verified:user.is_verified??false,unionIdPresent:Boolean(user.union_id),followerCount:user.follower_count??null},id:user.open_id,name:displayName,url:url.toString()};
}
function normalizeVideo(value:unknown):NormalizedSocialContent{const item=videoSchema.parse(value),url=canonicalProviderUrl("tiktok",item.share_url);if(!url)throw new Error("malformed_provider_response");return{provider:"tiktok",externalObjectId:item.id,objectType:"short_video",eventType:"published",title:item.title??null,description:item.video_description??null,canonicalUrl:url.toString(),thumbnailUrl:item.cover_image_url??null,mediaUrls:[],sourcePublishedAt:new Date(item.create_time*1000).toISOString(),scheduledStartAt:null,liveStatus:null,rawMetadata:{embedUrl:item.embed_link??null,duration:item.duration??null,width:item.width??null,height:item.height??null}};}
export async function pollTikTokVideos(accessToken:string,cursor?:string|null):Promise<ProviderPollResult>{const parsedCursor=cursor&&/^\d+$/.test(cursor)?Number(cursor):undefined,value=videosSchema.parse(await tiktok("video/list/?fields=id,create_time,share_url,title,video_description,embed_link,cover_image_url,duration,height,width",accessToken,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({max_count:20,...(parsedCursor===undefined?{}:{cursor:parsedCursor})})}));return{items:value.data.videos.map(normalizeVideo),cursor:value.data.has_more&&value.data.cursor!==undefined?String(value.data.cursor):null};}
export{normalizeVideo as normalizeTikTokVideo};

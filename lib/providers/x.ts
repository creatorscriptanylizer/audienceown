import {z} from "zod";
import {debugLog,debugStep,createTraceId} from "@/lib/debug";
import {SocialProviderError} from "@/lib/social-providers/errors";
import type{ProviderIdentity,ProviderPollResult,ProviderTokenSet}from"@/lib/social-providers/types";
import{canonicalExpansionThreeUrl}from"./provider-expansion-three";

const tokenSchema=z.object({token_type:z.string(),expires_in:z.number().int().positive(),access_token:z.string().min(1),scope:z.string(),refresh_token:z.string().min(1).optional()});
const userEnvelopeSchema=z.object({data:z.unknown()});
const userCoreSchema=z.object({id:z.string().regex(/^\d+$/)}).passthrough();
const optionalString=z.string().trim().min(1).nullable().optional().catch(undefined);
const optionalBoolean=z.boolean().nullable().optional().catch(undefined);
const userProfileSchema=z.object({name:optionalString,username:optionalString,description:optionalString,profile_image_url:optionalString,url:optionalString,protected:optionalBoolean}).passthrough();
const optionalMetric=z.number().int().nonnegative().nullable().optional();
const publicMetricsSchema=z.object({followers_count:optionalMetric,following_count:optionalMetric,tweet_count:optionalMetric,listed_count:optionalMetric}).passthrough();
const userMetricsSchema=z.object({public_metrics:publicMetricsSchema.nullable().optional()}).passthrough();
const postSchema=z.object({id:z.string().regex(/^\d+$/),text:z.string(),created_at:z.string().datetime(),author_id:z.string().regex(/^\d+$/),conversation_id:z.string().optional(),referenced_tweets:z.array(z.object({type:z.enum(["retweeted","quoted","replied_to"]),id:z.string()})).optional(),edit_history_tweet_ids:z.array(z.string()).optional()});
const timelineSchema=z.object({data:z.array(postSchema).optional(),meta:z.object({next_token:z.string().optional(),result_count:z.number().optional()}).optional()});

function clientAuth(){const id=process.env.X_CLIENT_ID,secret=process.env.X_CLIENT_SECRET;if(!id||!secret)throw new SocialProviderError("provider_not_configured","x","X OAuth credentials are unavailable.");return{header:`Basic ${Buffer.from(`${encodeURIComponent(id)}:${encodeURIComponent(secret)}`).toString("base64")}`,id};}
function retryAfter(response:Response){const reset=Number(response.headers.get("x-rate-limit-reset"));return Number.isFinite(reset)&&reset>0?Math.max(1,Math.ceil(reset-Date.now()/1000)):undefined;}
async function errorFor(response:Response,operation:string){const raw=await response.json().catch(()=>({})) as Record<string,unknown>,providerCode=typeof raw.error==="string"?raw.error:typeof raw.title==="string"?raw.title:`http_${response.status}`,code=response.status===401||providerCode==="invalid_grant"?"invalid_grant":response.status===403?"missing_approved_scope":response.status===429?"rate_limited":response.status>=500?"transient":"malformed_provider_object",error=new SocialProviderError(code,"x",`${operation} failed: ${code}.`,retryAfter(response));Object.assign(error,{providerCode,httpStatus:response.status});return error;}
async function token(body:URLSearchParams,operation:"token exchange"|"token refresh",requireRefresh:boolean){
  const{header}=clientAuth(),trace=debugStep("oauth",operation==="token exchange"?"x_token_exchange_start":"x_refresh_start",{traceId:createTraceId("x"),area:"x_oauth",provider:"x"});
  const response=await fetch("https://api.x.com/2/oauth2/token",{method:"POST",headers:{authorization:header,"content-type":"application/x-www-form-urlencoded"},body,cache:"no-store"});if(!response.ok){const error=await errorFor(response,operation);trace.failed(error);throw error;}
  const raw=await response.json().catch(()=>({})),parsed=tokenSchema.safeParse(raw);if(!parsed.success||requireRefresh&&!parsed.data.refresh_token){const error=new SocialProviderError("malformed_provider_object","x","X returned an incomplete token response.");trace.failed(error);throw error;}trace.success();return parsed.data;
}
const tokenSet=(value:z.infer<typeof tokenSchema>,fallback?:string):ProviderTokenSet=>{const refreshToken=value.refresh_token??fallback;if(!refreshToken)throw new SocialProviderError("malformed_provider_object","x","X did not return the required refresh token.");const scopes=value.scope.split(" ").filter(Boolean);return{accessToken:value.access_token,refreshToken,expiresAt:new Date(Date.now()+value.expires_in*1000).toISOString(),scopes,grantedScopes:scopes,tokenType:value.token_type};};
export async function exchangeXCode(code:string,verifier?:string){const{id}=clientAuth(),redirect=process.env.X_REDIRECT_URI;if(!redirect)throw new SocialProviderError("provider_not_configured","x","X redirect URI is unavailable.");if(!verifier)throw new SocialProviderError("invalid_grant","x","X PKCE verification is required.");return tokenSet(await token(new URLSearchParams({code,grant_type:"authorization_code",client_id:id,redirect_uri:redirect,code_verifier:verifier}),"token exchange",true));}
export async function refreshXToken(refreshToken:string){const{id}=clientAuth();return tokenSet(await token(new URLSearchParams({refresh_token:refreshToken,grant_type:"refresh_token",client_id:id}),"token refresh",false),refreshToken);}
export async function revokeXToken(tokenValue:string){const{header,id}=clientAuth(),trace=debugStep("oauth","x_disconnect",{traceId:createTraceId("x"),area:"x_oauth",provider:"x"}),response=await fetch("https://api.x.com/2/oauth2/revoke",{method:"POST",headers:{authorization:header,"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({token:tokenValue,client_id:id}),cache:"no-store"});if(!response.ok){const error=await errorFor(response,"token revocation");trace.failed(error);throw error;}trace.success();}
async function xJson(path:string,accessToken:string){const response=await fetch(`https://api.x.com/2/${path}`,{headers:{authorization:`Bearer ${accessToken}`,accept:"application/json"},cache:"no-store"});if(!response.ok)throw await errorFor(response,"X API request");return response.json() as Promise<unknown>;}
function wireType(value:unknown){return Array.isArray(value)?"array":value===null?"null":typeof value;}
function logIdentityShape(raw:unknown,validationCategory:string){
  const envelope=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw as Record<string,unknown>:null,data=envelope?.data,dataObject=data&&typeof data==="object"&&!Array.isArray(data)?data as Record<string,unknown>:null;
  const field=(key:string)=>({present:Boolean(dataObject&&Object.prototype.hasOwnProperty.call(dataObject,key)),type:dataObject?wireType(dataObject[key]):"undefined"});
  const fields=Object.fromEntries(["id","name","username","description","profile_image_url","url","protected","public_metrics"].map(key=>[key,field(key)]));
  debugLog("oauth",{event:"x_identity_response_shape",responseKeys:envelope?Object.keys(envelope).sort():[],dataKeys:dataObject?Object.keys(dataObject).sort():[],fields,validationCategory});
}
function safeAbsoluteHttpUrl(value:string|null|undefined){if(!value)return null;try{const url=new URL(value);return url.protocol==="https:"||url.protocol==="http:"?url.toString():null;}catch{return null;}}
export async function fetchXIdentity(accessToken:string):Promise<ProviderIdentity>{
  const raw=await xJson("users/me?user.fields=id,name,username,description,profile_image_url,url,protected,public_metrics",accessToken),envelope=userEnvelopeSchema.safeParse(raw);
  if(!envelope.success){logIdentityShape(raw,"invalid_envelope");throw new SocialProviderError("malformed_provider_object","x","X returned an invalid identity envelope.");}
  const core=userCoreSchema.safeParse(envelope.data.data);
  if(!core.success){logIdentityShape(raw,"invalid_core_identity");throw new SocialProviderError("malformed_provider_object","x","X returned an invalid stable identity.");}
  const profile=userProfileSchema.parse(envelope.data.data),metrics=userMetricsSchema.safeParse(envelope.data.data);
  if(!metrics.success){logIdentityShape(raw,"invalid_audience_statistics");throw new SocialProviderError("malformed_provider_object","x","X returned invalid audience statistics.");}
  const user={id:core.data.id,name:profile.name,username:profile.username,description:profile.description,profile_image_url:profile.profile_image_url,url:profile.url,protected:profile.protected,public_metrics:metrics.data.public_metrics},username=user.username??null,displayName=user.name??username??"X account";
  const canonicalProfile=canonicalExpansionThreeUrl("x",username?`https://x.com/${encodeURIComponent(username)}`:`https://x.com/i/user/${user.id}`);
  if(!canonicalProfile){logIdentityShape(raw,"invalid_canonical_profile");throw new SocialProviderError("malformed_provider_object","x","X returned an invalid identity.");}
  const avatarUrl=safeAbsoluteHttpUrl(user.profile_image_url),websiteUrl=safeAbsoluteHttpUrl(user.url);
  logIdentityShape(raw,"valid_identity");
  return{externalAccountId:user.id,displayName,username,profileUrl:canonicalProfile.toString(),avatarUrl,id:user.id,name:displayName,url:canonicalProfile.toString(),metadata:{handle:username,description:user.description??null,profileImageUrl:avatarUrl,websiteUrl,protected:user.protected??false,followersCount:user.public_metrics?.followers_count??null}};
}
export async function pollXPosts(accessToken:string,userId:string,username:string,cursor?:string|null):Promise<ProviderPollResult>{if(!/^\d+$/.test(userId))throw new Error("stable_identity_required");const params=new URLSearchParams({"tweet.fields":"id,text,created_at,author_id,conversation_id,referenced_tweets,edit_history_tweet_ids",max_results:"100",exclude:"replies,retweets"});if(cursor)params.set("pagination_token",cursor);const value=timelineSchema.parse(await xJson(`users/${userId}/tweets?${params}`,accessToken));return{items:(value.data??[]).map(post=>({provider:"x",externalObjectId:post.id,objectType:"post",eventType:"published",title:post.text.slice(0,160),description:post.text,canonicalUrl:`https://x.com/${encodeURIComponent(username)}/status/${post.id}`,thumbnailUrl:null,mediaUrls:[],sourcePublishedAt:post.created_at,scheduledStartAt:null,liveStatus:null,rawMetadata:{authorId:post.author_id,conversationId:post.conversation_id??null,referencedPostTypes:post.referenced_tweets?.map(item=>item.type)??[],editHistoryIds:post.edit_history_tweet_ids??[]}})),cursor:value.meta?.next_token??null};}

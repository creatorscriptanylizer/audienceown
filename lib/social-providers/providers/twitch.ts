import { capabilities } from "../capabilities"; import { oauthProvider } from "../provider-factory";
import { verifyTwitchWebhook } from "../webhooks";
import { bearerJson,identity } from "../base-oauth";
export const twitchProvider=oauthProvider({displayName:"Twitch",availability:"implemented_credentials_required",
capabilities:capabilities({oauth:true,tokenRefresh:true,tokenRevocation:true,webhooks:true,contentDetection:true,livestreamDetection:true,scheduledContentDetection:true,automaticDrafts:true,automaticPublishing:true}),
config:{provider:"twitch",clientIdEnv:"TWITCH_CLIENT_ID",clientSecretEnv:"TWITCH_CLIENT_SECRET",redirectEnv:"TWITCH_REDIRECT_URI",authorizeUrl:"https://id.twitch.tv/oauth2/authorize",tokenUrl:"https://id.twitch.tv/oauth2/token",revokeUrl:"https://id.twitch.tv/oauth2/revoke",scopes:[]},
adapter:{async fetchIdentity({accessToken}){const body=await bearerJson("twitch","https://api.twitch.tv/helix/users",accessToken,{ "Client-Id":process.env.TWITCH_CLIENT_ID??""});
  const user=(Array.isArray(body.data)?body.data[0]:{}) as Record<string,unknown>;return identity(String(user.id??""),String(user.display_name??"Twitch broadcaster"),`https://www.twitch.tv/${String(user.login??"")}`);},
verifyWebhook:verifyTwitchWebhook,async normalizeWebhook(event){const payload=event.payload,eventData=(payload.event??{}) as Record<string,unknown>;
  const broadcaster=String(eventData.broadcaster_user_login??""),started=String(eventData.started_at??payload._provider_event_timestamp??"");
  if(!broadcaster||!["stream.online","stream.offline","channel.update"].includes(event.eventType))return[];
  return[{provider:"twitch",externalObjectId:String(eventData.id??`${broadcaster}:${event.eventType}`),externalEventId:event.eventId,
    objectType:"livestream",eventType:event.eventType==="stream.online"?"live_started":event.eventType==="stream.offline"?"live_ended":"updated",
    title:typeof eventData.title==="string"?eventData.title:null,description:null,canonicalUrl:`https://www.twitch.tv/${broadcaster}`,
    thumbnailUrl:null,mediaUrls:[],sourcePublishedAt:started,scheduledStartAt:null,liveStatus:event.eventType==="stream.online"?"live":"offline",rawMetadata:{}}];}}});

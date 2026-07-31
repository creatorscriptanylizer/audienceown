import { capabilities } from "../capabilities";
import type { SocialProviderAdapter } from "../types";
import { getYouTubeAuthorizationUrl, exchangeYouTubeCode, refreshYouTubeAccessToken } from "@/lib/youtube-oauth";
import { getYouTubeChannel, pollYouTubeUploads } from "@/lib/youtube-watcher";

export const youtubeProvider: SocialProviderAdapter = {
  provider:"youtube", displayName:"YouTube", availability:"implemented_credentials_required",
  capabilities:capabilities({oauth:true,tokenRefresh:true,tokenRevocation:true,polling:true,
    contentDetection:true,livestreamDetection:true,scheduledContentDetection:true,
    automaticDrafts:true,automaticPublishing:true}),
  emergencyVerification:{oauthIdentityVerification:true,connectedAccountVerification:true,
    profileChallengeVerification:false,providerApiVerification:true},
  requestedScopes:["https://www.googleapis.com/auth/youtube.readonly"],
  async createAuthorizationUrl({state}) { return {url:getYouTubeAuthorizationUrl(state)}; },
  async exchangeAuthorizationCode({code}) {
    const token=await exchangeYouTubeCode(code); return {accessToken:token.access_token,refreshToken:token.refresh_token,
      expiresAt:new Date(Date.now()+token.expires_in*1000).toISOString(),grantedScopes:(token.scope??"").split(" ").filter(Boolean),tokenType:token.token_type??"Bearer"};
  },
  async refreshAccessToken({refreshToken}) {
    if(!refreshToken) throw new Error("invalid_grant"); const token=await refreshYouTubeAccessToken(refreshToken);
    return {accessToken:token.access_token,refreshToken:token.refresh_token,expiresAt:new Date(Date.now()+token.expires_in*1000).toISOString(),
      grantedScopes:(token.scope??"").split(" ").filter(Boolean),tokenType:token.token_type??"Bearer"};
  },
  async fetchIdentity({accessToken}) { const channel=await getYouTubeChannel(accessToken);
    return {id:channel.id,name:channel.title,url:`https://www.youtube.com/channel/${channel.id}`,metadata:{uploads_playlist_id:channel.uploadsPlaylistId}}; },
  async fetchEmergencyAccountIdentity({accessToken}) { const channel=await getYouTubeChannel(accessToken);
    return {id:channel.id,name:channel.title,url:`https://www.youtube.com/channel/${channel.id}`,metadata:{uploads_playlist_id:channel.uploadsPlaylistId}}; },
  async verifyEmergencyAccountOwnership({accessToken}) { const channel=await getYouTubeChannel(accessToken);
    return {id:channel.id,name:channel.title,url:`https://www.youtube.com/channel/${channel.id}`,metadata:{uploads_playlist_id:channel.uploadsPlaylistId}}; },
  async pollContent({accessToken,cursor,metadata}) {
    const result=await pollYouTubeUploads(accessToken,String(metadata?.uploads_playlist_id??""),cursor??null);
    return {cursor:result.cursor,items:result.items.flatMap((item)=>item.publishedAt?[{
      provider:"youtube" as const,externalObjectId:item.externalObjectId,objectType:item.objectType,
      eventType:item.eventType==="live_completed"?"live_ended" as const:item.eventType,title:item.title,description:item.description,
      canonicalUrl:item.canonicalUrl,thumbnailUrl:item.thumbnailUrl,mediaUrls:[],sourcePublishedAt:item.publishedAt,
      scheduledStartAt:item.scheduledStartTime,liveStatus:item.liveStatus,rawMetadata:{},
    }]:[])};
  },
};

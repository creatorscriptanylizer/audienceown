import { capabilities } from "../capabilities"; import { oauthProvider } from "../provider-factory";
export const tiktokProvider=oauthProvider({displayName:"TikTok",availability:"provider_review_required",unavailableReason:"video.list requires TikTok app review.",
capabilities:capabilities({oauth:true,tokenRefresh:true,tokenRevocation:true,polling:true,webhooks:true,contentDetection:true,automaticDrafts:true,automaticPublishing:true}),
config:{provider:"tiktok",clientIdEnv:"TIKTOK_CLIENT_KEY",clientSecretEnv:"TIKTOK_CLIENT_SECRET",redirectEnv:"TIKTOK_REDIRECT_URI",clientIdParam:"client_key",authorizeUrl:"https://www.tiktok.com/v2/auth/authorize/",tokenUrl:"https://open.tiktokapis.com/v2/oauth/token/",scopes:["user.info.basic","video.list"]}});

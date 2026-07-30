import { capabilities } from "../capabilities"; import { oauthProvider } from "../provider-factory";
export const instagramProvider=oauthProvider({displayName:"Instagram",availability:"provider_review_required",
unavailableReason:"Professional account and Meta app review required.",capabilities:capabilities({oauth:true,tokenRefresh:true,tokenRevocation:true,polling:true,webhooks:true,contentDetection:true,automaticDrafts:true,automaticPublishing:true}),
config:{provider:"instagram",clientIdEnv:"INSTAGRAM_CLIENT_ID",clientSecretEnv:"INSTAGRAM_CLIENT_SECRET",redirectEnv:"INSTAGRAM_REDIRECT_URI",authorizeUrl:"https://www.instagram.com/oauth/authorize",tokenUrl:"https://api.instagram.com/oauth/access_token",scopes:["instagram_business_basic"]}});

import { capabilities } from "../capabilities"; import { oauthProvider } from "../provider-factory";
export const xProvider=oauthProvider({displayName:"X",availability:"provider_review_required",unavailableReason:"Timeline access depends on the configured X API product tier.",
capabilities:capabilities({oauth:true,tokenRefresh:true,tokenRevocation:true,polling:true,contentDetection:true,automaticDrafts:true,automaticPublishing:true}),
config:{provider:"x",clientIdEnv:"X_CLIENT_ID",clientSecretEnv:"X_CLIENT_SECRET",redirectEnv:"X_REDIRECT_URI",authorizeUrl:"https://x.com/i/oauth2/authorize",tokenUrl:"https://api.x.com/2/oauth2/token",revokeUrl:"https://api.x.com/2/oauth2/revoke",scopes:["users.read","tweet.read","offline.access"]}});

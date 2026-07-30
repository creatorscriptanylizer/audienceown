import { capabilities } from "../capabilities"; import { oauthProvider } from "../provider-factory";
import { bearerJson,identity } from "../base-oauth";
export const snapchatProvider=oauthProvider({displayName:"Snapchat",availability:"manual_import_only",unavailableReason:"Login Kit exposes identity but not public creator-content detection.",
capabilities:capabilities({oauth:true,manualImport:true}),config:{provider:"snapchat",clientIdEnv:"SNAPCHAT_CLIENT_ID",clientSecretEnv:"SNAPCHAT_CLIENT_SECRET",redirectEnv:"SNAPCHAT_REDIRECT_URI",authorizeUrl:"https://accounts.snapchat.com/login/oauth2/authorize",tokenUrl:"https://accounts.snapchat.com/login/oauth2/access_token",scopes:["https://auth.snapchat.com/oauth2/api/user.external_id","https://auth.snapchat.com/oauth2/api/user.display_name"]},
adapter:{async fetchIdentity({accessToken}){const data=await bearerJson("snapchat","https://kit.snapchat.com/v1/me?query=%7Bme%7BexternalId%20displayName%7D%7D",accessToken);
const me=((data.data as Record<string,unknown>|undefined)?.me??{}) as Record<string,unknown>;
return identity(String(me.externalId??""),String(me.displayName??"Snapchat creator"),"https://www.snapchat.com/");}}});

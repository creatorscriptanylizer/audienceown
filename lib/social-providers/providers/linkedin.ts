import { capabilities } from "../capabilities"; import { oauthProvider } from "../provider-factory";
import { bearerJson,identity } from "../base-oauth";
export const linkedinProvider=oauthProvider({displayName:"LinkedIn",availability:"provider_review_required",unavailableReason:"Post read products require LinkedIn approval; manual import remains available.",
capabilities:capabilities({oauth:true,manualImport:true}),config:{provider:"linkedin",clientIdEnv:"LINKEDIN_CLIENT_ID",clientSecretEnv:"LINKEDIN_CLIENT_SECRET",redirectEnv:"LINKEDIN_REDIRECT_URI",authorizeUrl:"https://www.linkedin.com/oauth/v2/authorization",tokenUrl:"https://www.linkedin.com/oauth/v2/accessToken",scopes:["openid","profile"]},
adapter:{async fetchIdentity({accessToken}){const data=await bearerJson("linkedin","https://api.linkedin.com/v2/userinfo",accessToken);
return identity(String(data.sub??""),String(data.name??"LinkedIn member"),"https://www.linkedin.com/in/me");}}});

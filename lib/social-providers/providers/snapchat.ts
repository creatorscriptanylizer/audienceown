import { capabilities } from "../capabilities";
import { oauthProvider } from "../provider-factory";
import { classifyExpansionFourError, manualExpansionFourContent } from "@/lib/providers/provider-expansion-four";
import { fetchSnapchatIdentity } from "@/lib/providers/snapchat";

const scopes=["https://auth.snapchat.com/oauth2/api/user.external_id","https://auth.snapchat.com/oauth2/api/user.display_name"];
const config={provider:"snapchat" as const,clientIdEnv:"SNAPCHAT_CLIENT_ID",clientSecretEnv:"SNAPCHAT_CLIENT_SECRET",redirectEnv:"SNAPCHAT_REDIRECT_URI",authorizeUrl:"https://accounts.snapchat.com/accounts/oauth2/auth",tokenUrl:"https://accounts.snapchat.com/accounts/oauth2/token",revokeUrl:"https://accounts.snapchat.com/accounts/oauth2/revoke",scopes,pkce:false};

export const snapchatProvider=oauthProvider({
  displayName:"Snapchat",availability:"provider_review_required",unavailableReason:"Login Kit verifies an app-scoped Snapchat identity. Public Profile ownership and subscriber metrics require a separate allowlisted API product.",
  capabilities:capabilities({oauth:true,tokenRefresh:true,tokenRevocation:true,polling:false,contentDetection:false,automaticDrafts:false,automaticPublishing:false,manualImport:true}),config,
  adapter:{
    fetchIdentity:({accessToken})=>fetchSnapchatIdentity(accessToken),
    async revokeConnection({accessToken,refreshToken}){const clientId=process.env.SNAPCHAT_CLIENT_ID,secret=process.env.SNAPCHAT_CLIENT_SECRET;if(!clientId||!secret)throw new Error("snapchat_not_configured");const response=await fetch(config.revokeUrl,{method:"POST",headers:{authorization:`Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({token:refreshToken??accessToken}),cache:"no-store"});if(!response.ok)throw new Error("snapchat_revocation_failed");},
    readiness(){const required=["SNAPCHAT_CLIENT_ID","SNAPCHAT_CLIENT_SECRET","SNAPCHAT_REDIRECT_URI"],missingConfiguration=required.filter(name=>!process.env[name]),configured=missingConfiguration.length===0;return{configured,credentialsPresent:configured,productConfigured:configured,requiredScopes:scopes,grantedScopes:[],missingScopes:scopes,accessLevel:configured?"development":"none",reviewStatus:configured?"required":"not_configured",connectionAvailable:configured,identityAvailable:configured,assetDiscoveryAvailable:false,contentDetectionAvailable:false,pollingAvailable:false,webhookAvailable:false,manualImportAvailable:true,manualVerificationAvailable:true,verificationAvailable:configured,manualFallbackAvailable:true,missingConfiguration,limitations:["Login Kit does not verify Public Profile ownership.","The Public Profile API is a separate allowlisted product and is not enabled by this connection.","Subscriber metrics, contacts, friends, messages, Memories, and private content are unavailable.","A creator-supplied public Snapchat URL is required for follower-facing presentation."]};},
    manualImport:async value=>manualExpansionFourContent("snapchat",value),manualVerification:async()=>({verified:false,reason:"A Snapchat URL or Login Kit identity alone does not verify a Public Profile."}),classifyError:classifyExpansionFourError
  }
});

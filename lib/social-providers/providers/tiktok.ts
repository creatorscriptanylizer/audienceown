import { capabilities } from "../capabilities";
import { oauthProvider } from "../provider-factory";
import { classifyExpansionTwoError,manualProviderContent,reviewStatus } from "@/lib/providers/provider-expansion-two";
import { exchangeTikTokCode,fetchTikTokIdentity,pollTikTokVideos,refreshTikTokToken,revokeTikTokToken } from "@/lib/providers/tiktok";

const oauthScopes=["user.info.basic","user.info.profile","user.info.stats"];
const contentScope="video.list";
const configured=()=>Boolean(process.env.TIKTOK_CLIENT_KEY&&process.env.TIKTOK_CLIENT_SECRET&&process.env.TIKTOK_REDIRECT_URI);
const review=()=>reviewStatus(process.env.TIKTOK_APP_REVIEW_STATUS);

export const tiktokProvider=oauthProvider({
  displayName:"TikTok",availability:"provider_review_required",
  unavailableReason:"TikTok production access and profile/statistics scopes require app review.",
  capabilities:capabilities({oauth:true,tokenRefresh:true,tokenRevocation:true,polling:true,webhooks:false,contentDetection:true,automaticDrafts:true,automaticPublishing:false,manualImport:true}),
  config:{provider:"tiktok",clientIdEnv:"TIKTOK_CLIENT_KEY",clientSecretEnv:"TIKTOK_CLIENT_SECRET",redirectEnv:"TIKTOK_REDIRECT_URI",clientIdParam:"client_key",authorizeUrl:"https://www.tiktok.com/v2/auth/authorize/",tokenUrl:"https://open.tiktokapis.com/v2/oauth/token/",scopes:oauthScopes,scopeSeparator:","},
  adapter:{
    exchangeAuthorizationCode:({code})=>exchangeTikTokCode(code),
    refreshAccessToken:({refreshToken})=>{if(!refreshToken)throw new Error("invalid_grant");return refreshTikTokToken(refreshToken);},
    revokeConnection:({accessToken})=>revokeTikTokToken(accessToken),fetchIdentity:({accessToken,metadata})=>fetchTikTokIdentity(accessToken,{expectedOpenId:typeof metadata?.externalAccountId==="string"?metadata.externalAccountId:undefined,grantedScopes:Array.isArray(metadata?.grantedScopes)?metadata.grantedScopes.filter((scope):scope is string=>typeof scope==="string"):undefined}),
    pollContent:({accessToken,cursor})=>pollTikTokVideos(accessToken,cursor),fetchContent:({accessToken,cursor})=>pollTikTokVideos(accessToken,cursor),
    readiness:()=>{const credentialsPresent=configured(),reviewStatus=review(),approved=reviewStatus==="approved";return{configured:credentialsPresent,credentialsPresent,productConfigured:credentialsPresent,requiredScopes:oauthScopes,grantedScopes:[],missingScopes:oauthScopes,accessLevel:approved?"approved":credentialsPresent?"development":"none",reviewStatus,connectionAvailable:credentialsPresent,identityAvailable:credentialsPresent,assetDiscoveryAvailable:false,contentDetectionAvailable:false,webhookAvailable:false,pollingAvailable:false,manualImportAvailable:true,manualVerificationAvailable:true,verificationAvailable:true,manualFallbackAvailable:true,missingConfiguration:["TIKTOK_CLIENT_KEY","TIKTOK_CLIENT_SECRET","TIKTOK_REDIRECT_URI"].filter(name=>!process.env[name]),limitations:[...(!approved?["TikTok production access and user.info.profile/user.info.stats require app review."]:[]),`${contentScope} is not requested by the account-connection flow; video detection remains disabled.`,"No new-video webhook is available for Display API.","TikTok publishing is not supported."]};},
    manualImport:async value=>manualProviderContent("tiktok",value),manualVerification:async()=>({verified:false,reason:"A profile URL alone does not establish ownership; complete authoritative OAuth verification."}),
    calculateNextSync:()=>new Date(Date.now()+6*60*60_000),classifyError:classifyExpansionTwoError,
  },
});

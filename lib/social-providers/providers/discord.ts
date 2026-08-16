import { z } from "zod";
import { capabilities } from "../capabilities";
import { oauthProvider } from "../provider-factory";
import { bearerJson, identity } from "../base-oauth";
import { discordGuildAuthority, discordGuildSchema } from "@/lib/providers/discord-authority";

const userSchema=z.object({id:z.string().regex(/^\d+$/),username:z.unknown().optional(),global_name:z.unknown().optional(),avatar:z.unknown().optional()});
const config={provider:"discord" as const,clientIdEnv:"DISCORD_CLIENT_ID",clientSecretEnv:"DISCORD_CLIENT_SECRET",redirectEnv:"DISCORD_REDIRECT_URI",authorizeUrl:"https://discord.com/oauth2/authorize",tokenUrl:"https://discord.com/api/oauth2/token",revokeUrl:"https://discord.com/api/oauth2/token/revoke",scopes:["identify","guilds"],pkce:false};

export const discordProvider=oauthProvider({
  displayName:"Discord",availability:"implemented_credentials_required",unavailableReason:"OAuth verifies a user and eligible guild authority; a creator-supplied invite is required for a public destination.",
  capabilities:capabilities({oauth:true,tokenRefresh:true,tokenRevocation:true,polling:false,webhooks:false,contentDetection:false,automaticDrafts:false,automaticPublishing:false,manualImport:true}),config,
  adapter:{
    readiness(){const required=["DISCORD_CLIENT_ID","DISCORD_CLIENT_SECRET","DISCORD_REDIRECT_URI"],missingConfiguration=required.filter(x=>!process.env[x]);return{configured:missingConfiguration.length===0,connectionAvailable:missingConfiguration.length===0,verificationAvailable:missingConfiguration.length===0,contentDetectionAvailable:false,webhookAvailable:false,pollingAvailable:false,manualFallbackAvailable:true,missingConfiguration,limitations:["OAuth verifies the authorizing user and selected guild authority separately.","A creator-supplied Discord invite is required before the guild can be public.","The optional bot workflow remains separate and is not requested by account OAuth."]};},
    async fetchIdentity({accessToken}){const parsed=userSchema.parse(await bearerJson("discord","https://discord.com/api/v10/users/@me",accessToken)),username=typeof parsed.username==="string"&&parsed.username.trim()?parsed.username:null,globalName=typeof parsed.global_name==="string"&&parsed.global_name.trim()?parsed.global_name:null,avatar=typeof parsed.avatar==="string"&&parsed.avatar?parsed.avatar:null;return identity(parsed.id,globalName??username??"Discord user","https://discord.com/",{identityType:"authorizing_user",username,globalName,avatar});},
    async discoverSources({accessToken}){const value=await bearerJson("discord","https://discord.com/api/v10/users/@me/guilds?limit=200&with_counts=true",accessToken),guilds=z.array(discordGuildSchema).parse(value);return guilds.filter(g=>discordGuildAuthority(g).guildAuthority).map(g=>{const authority=discordGuildAuthority(g);return{sourceType:"discord_guild",stableSourceId:g.id,displayName:g.name,canonicalUrl:"https://discord.com/",metadata:{identityType:"guild",authorityRole:authority.authorityRole,authorityValidated:true,icon:g.icon??null,approximateMemberCount:g.approximate_member_count??null,publicInviteRequired:true}};});},
    async discoverAssets(context){const value=await this.discoverSources!(context);return value;},
    async revokeConnection({accessToken}){const clientId=process.env.DISCORD_CLIENT_ID,secret=process.env.DISCORD_CLIENT_SECRET;if(!clientId||!secret)throw new Error("discord_not_configured");const response=await fetch(config.revokeUrl,{method:"POST",headers:{authorization:`Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({token:accessToken,token_type_hint:"access_token"}),cache:"no-store"});if(!response.ok)throw new Error("discord_revocation_failed");},
    async manualVerification(){return{verified:false,reason:"A Discord invite alone remains unverified; OAuth guild authority or operator review is required."};},
    calculateNextSync(){return new Date(Date.now()+6*60*60_000);},classifyError(error){const message=error instanceof Error?error.message:"";return{code:message.includes("403")?"permission_denied":"temporary_provider_failure",retryable:!message.includes("403")};}
  }
});

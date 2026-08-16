import "server-only";
import type { Json } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSocialSecret } from "@/lib/social-secrets";
import { getSocialProvider } from "@/lib/social-providers/registry";
import { validateDiscordInvite } from "./discord-authority";

async function authorization(creatorId:string,connectionId:string){
  const db=createAdminClient();if(!db)throw new Error("discord_not_configured");
  const[{data:connection},{data:secret}]=await Promise.all([
    db.from("connected_accounts").select("id,account_type,external_account_id,provider_metadata,granted_scopes").eq("id",connectionId).eq("creator_id",creatorId).eq("platform","discord").maybeSingle(),
    db.from("platform_connection_secrets").select("access_token_ciphertext").eq("platform_connection_id",connectionId).maybeSingle(),
  ]);
  if(!connection||!secret)throw new Error("discord_connection_unavailable");
  return{db,connection,accessToken:decryptSocialSecret(secret.access_token_ciphertext)};
}

export async function listEligibleDiscordGuilds(creatorId:string,connectionId:string){
  const{accessToken}=await authorization(creatorId,connectionId),assets=await getSocialProvider("discord").discoverAssets!({accessToken});
  return assets.map(asset=>({id:asset.stableSourceId,name:asset.displayName,icon:asset.metadata.icon??null,approximateMemberCount:asset.metadata.approximateMemberCount??null,authorityRole:asset.metadata.authorityRole}));
}

export async function selectOAuthDiscordGuild(creatorId:string,connectionId:string,guildId:string,invite?:string){
  const{db,connection,accessToken}=await authorization(creatorId,connectionId),assets=await getSocialProvider("discord").discoverAssets!({accessToken}),asset=assets.find(item=>item.stableSourceId===guildId);
  if(!asset)throw new Error("discord_guild_authority_required");
  const duplicate=await db.from("connected_accounts").select("id").eq("creator_id",creatorId).eq("platform","discord").contains("provider_metadata",{selectedGuildId:guildId}).neq("id",connectionId).maybeSingle();
  if(duplicate.data)throw new Error("already_connected");
  const publicInvite=invite?validateDiscordInvite(invite):null;if(invite&&!publicInvite)throw new Error("invalid_discord_invite");
  const oldMetadata=connection.provider_metadata&&typeof connection.provider_metadata==="object"?connection.provider_metadata as Record<string,unknown>:{},authorizingUserId=connection.external_account_id,role=connection.account_type==="backup"?"backup" as const:"official" as const,url=publicInvite??"https://discord.com/",authorityRole=typeof asset.metadata.authorityRole==="string"?asset.metadata.authorityRole:"manage_guild";
  const values={url,is_public:Boolean(publicInvite),external_account_url:publicInvite,provider_metadata:{...oldMetadata,authorizingUserId,selectedGuildId:guildId,selectedGuildName:asset.displayName,...asset.metadata,publicInviteRequired:!publicInvite,publicInvite:publicInvite??null,selectionRequired:false} as Json,connection_health:"healthy",provider_status:publicInvite?"ready":"public_invite_required",last_sync_at:new Date().toISOString()};
  const updated=await db.from("connected_accounts").update(values).eq("id",connectionId).eq("creator_id",creatorId).select("id").single();if(updated.error)throw updated.error;
  const selected=await db.rpc("select_provider_asset",{p_connected_account_id:connectionId,p_provider:"discord",p_asset_type:"discord_guild",p_stable_asset_id:guildId,p_parent_asset_id:"",p_display_name:asset.displayName??"Discord server",p_display_handle:"",p_canonical_url:url,p_metadata:{authorityRole,authorityValidated:true,publicInviteRequired:!publicInvite}});if(selected.error)throw selected.error;
  const{initializeProviderAudience}=await import("@/lib/social-providers/initial-audience");await initializeProviderAudience({db,creatorId,connectionId,provider:"discord",role,accessToken,stableId:guildId});await db.rpc("sync_identity_account_from_connection",{p_connection_id:connectionId});
  return{connectionId,guildId,displayName:asset.displayName,approximateMemberCount:asset.metadata.approximateMemberCount??null,publicInviteRequired:!publicInvite};
}

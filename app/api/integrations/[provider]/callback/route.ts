import { cookies } from "next/headers";import { NextResponse } from "next/server";import { getCreator,getViewer } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";import { encryptSocialSecret } from "@/lib/social-secrets";
import { verifyOAuthState } from "@/lib/social-providers/oauth";import { getSocialProvider } from "@/lib/social-providers/registry";
import { isSocialProvider } from "@/lib/social-providers/normalize";
import type { Json } from "@/lib/database.types";
import { providerReadiness } from "@/lib/social-providers/readiness";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{provider:string}>}){
  const{provider:raw}=await params;if(!isSocialProvider(raw))return Response.json({error:"Unknown provider"},{status:404});
  const url=new URL(request.url),store=await cookies(),cookie=store.get(`social_oauth_${raw}`)?.value;store.delete(`social_oauth_${raw}`);
  let saved:{nonce:string;verifier?:string}|null=null;try{saved=cookie?JSON.parse(cookie):null;}catch{}
  const state=saved&&url.searchParams.get("state")?verifyOAuthState(url.searchParams.get("state")!,raw,saved.nonce):null;
  const[user,creator]=await Promise.all([getViewer(),getCreator()]);
  if(!state||!user||!creator||state.userId!==user.id||state.creatorId!==creator.id)return NextResponse.redirect(new URL(`/dashboard/platforms?social=${raw}:invalid_state`,request.url));
  const adapter=getSocialProvider(raw),code=url.searchParams.get("code"),admin=createAdminClient();
  if(!code||!admin||!adapter.exchangeAuthorizationCode||!adapter.fetchIdentity)return NextResponse.redirect(new URL(`/dashboard/platforms?social=${raw}:connection_failed`,request.url));
  try{const tokens=await adapter.exchangeAuthorizationCode({code,codeVerifier:saved?.verifier});const identity=await adapter.fetchIdentity({accessToken:tokens.accessToken,metadata:tokens.stableIdentityId?{externalAccountId:tokens.stableIdentityId}:undefined});const readiness=providerReadiness(adapter),detectionReady=readiness.contentDetectionAvailable&&readiness.requiredScopes.every(scope=>tokens.grantedScopes.includes(scope));
    const oidcIdentityOnly=raw==="linkedin"&&!readiness.contentDetectionAvailable;const values={creator_id:creator.id,platform:raw,account_type:"official",label:identity.name,url:identity.url,is_primary:!oidcIdentityOnly,is_public:!oidcIdentityOnly,
      external_account_id:identity.id,external_account_name:identity.name,external_account_url:identity.url,provider_metadata:identity.metadata as Json,
      requested_scopes:adapter.requestedScopes,granted_scopes:tokens.grantedScopes,watch_enabled:detectionReady&&raw!=="discord",
      auto_create_drafts:true,auto_send:false,webhook_enabled:detectionReady&&readiness.webhookAvailable,connection_health:"healthy",provider_status:detectionReady?"ready":"automatic_detection_unavailable",
      token_expires_at:tokens.expiresAt,token_refreshed_at:new Date().toISOString()};
    const existing=await admin.from("connected_accounts").select("id").eq("creator_id",creator.id).eq("platform",raw).eq("account_type","official").limit(1).maybeSingle();
    const result=existing.data?await admin.from("connected_accounts").update(values).eq("id",existing.data.id).select("id").single():
      await admin.from("connected_accounts").insert(values).select("id").single();if(result.error)throw result.error;
    const current=await admin.from("platform_connection_secrets").select("refresh_token_ciphertext").eq("platform_connection_id",result.data.id).maybeSingle();
    await admin.from("platform_connection_secrets").upsert({platform_connection_id:result.data.id,access_token_ciphertext:encryptSocialSecret(tokens.accessToken),
      refresh_token_ciphertext:tokens.refreshToken?encryptSocialSecret(tokens.refreshToken):current.data?.refresh_token_ciphertext??null,
      token_scope:tokens.grantedScopes.join(" "),token_type:tokens.tokenType});
    if(raw==="x"||raw==="threads"){const handle=typeof identity.metadata.handle==="string"?identity.metadata.handle:"",assetType=raw==="x"?"x_account":"threads_account",selected=await admin.rpc("select_provider_asset",{p_connected_account_id:result.data.id,p_provider:raw,p_asset_type:assetType,p_stable_asset_id:identity.id,p_parent_asset_id:"",p_display_name:identity.name,p_display_handle:handle,p_canonical_url:identity.url,p_metadata:{oauthAuthority:true,providerProduct:raw}});if(selected.error)throw selected.error;}
    if(raw==="spotify"||raw==="snapchat"||raw==="pinterest"){const assetType=raw==="spotify"?"spotify_user":raw==="snapchat"?"snapchat_user":"pinterest_user",handle=typeof identity.metadata.username==="string"?identity.metadata.username:"",selected=await admin.rpc("select_provider_asset",{p_connected_account_id:result.data.id,p_provider:raw,p_asset_type:assetType,p_stable_asset_id:identity.id,p_parent_asset_id:"",p_display_name:identity.name,p_display_handle:handle,p_canonical_url:identity.url,p_metadata:{oauthAuthority:true,accountIdentityOnly:true,creatorAssetAuthority:false}});if(selected.error)throw selected.error;}
    if(raw==="twitch"){const hostname=new URL(identity.url).hostname,{data:destinationId,error:destinationError}=await admin.rpc("ensure_ecosystem_destination",{p_provider:"twitch",p_destination_type:"livestream",p_stable_external_id:identity.id,p_display_name:identity.name,p_display_handle:typeof identity.metadata.login==="string"?identity.metadata.login:identity.name,p_canonical_url:identity.url,p_hostname:hostname,p_source_connection_id:result.data.id,p_metadata:{oauthAuthority:true}});if(destinationError||!destinationId)throw destinationError??new Error("twitch_destination_failed");const verified=await admin.rpc("verify_ecosystem_destination",{p_destination_id:destinationId,p_method:"twitch_oauth",p_confidence:"high",p_stable_external_id:identity.id});if(verified.error)throw verified.error;}
    console.info("social_automation",{event:"connection_established",provider:raw,connectionId:result.data.id});
    return NextResponse.redirect(new URL(`/dashboard/platforms?social=${raw}:connected`,request.url));
  }catch{return NextResponse.redirect(new URL(`/dashboard/platforms?social=${raw}:${adapter.availability}`,request.url));}
}

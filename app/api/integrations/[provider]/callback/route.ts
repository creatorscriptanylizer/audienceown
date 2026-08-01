import { cookies } from "next/headers";import { NextResponse } from "next/server";import { getCreator,getViewer } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";import { encryptSocialSecret } from "@/lib/social-secrets";
import { verifyOAuthState } from "@/lib/social-providers/oauth";import { getSocialProvider } from "@/lib/social-providers/registry";
import { isSocialProvider } from "@/lib/social-providers/normalize";
import type { Json } from "@/lib/database.types";
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
  try{const tokens=await adapter.exchangeAuthorizationCode({code,codeVerifier:saved?.verifier});const identity=await adapter.fetchIdentity({accessToken:tokens.accessToken});
    const values={creator_id:creator.id,platform:raw,account_type:"official",label:identity.name,url:identity.url,is_primary:true,is_public:true,
      external_account_id:identity.id,external_account_name:identity.name,external_account_url:identity.url,provider_metadata:identity.metadata as Json,
      requested_scopes:adapter.requestedScopes,granted_scopes:tokens.grantedScopes,watch_enabled:adapter.capabilities.contentDetection&&raw!=="discord",
      auto_create_drafts:true,auto_send:false,webhook_enabled:adapter.capabilities.webhooks,connection_health:"healthy",provider_status:"ready",
      token_expires_at:tokens.expiresAt,token_refreshed_at:new Date().toISOString()};
    const existing=await admin.from("connected_accounts").select("id").eq("creator_id",creator.id).eq("platform",raw).eq("account_type","official").limit(1).maybeSingle();
    const result=existing.data?await admin.from("connected_accounts").update(values).eq("id",existing.data.id).select("id").single():
      await admin.from("connected_accounts").insert(values).select("id").single();if(result.error)throw result.error;
    const current=await admin.from("platform_connection_secrets").select("refresh_token_ciphertext").eq("platform_connection_id",result.data.id).maybeSingle();
    await admin.from("platform_connection_secrets").upsert({platform_connection_id:result.data.id,access_token_ciphertext:encryptSocialSecret(tokens.accessToken),
      refresh_token_ciphertext:tokens.refreshToken?encryptSocialSecret(tokens.refreshToken):current.data?.refresh_token_ciphertext??null,
      token_scope:tokens.grantedScopes.join(" "),token_type:tokens.tokenType});
    if(raw==="twitch"){const hostname=new URL(identity.url).hostname,{data:destinationId,error:destinationError}=await admin.rpc("ensure_ecosystem_destination",{p_provider:"twitch",p_destination_type:"livestream",p_stable_external_id:identity.id,p_display_name:identity.name,p_display_handle:typeof identity.metadata.login==="string"?identity.metadata.login:identity.name,p_canonical_url:identity.url,p_hostname:hostname,p_source_connection_id:result.data.id,p_metadata:{oauthAuthority:true}});if(destinationError||!destinationId)throw destinationError??new Error("twitch_destination_failed");const verified=await admin.rpc("verify_ecosystem_destination",{p_destination_id:destinationId,p_method:"twitch_oauth",p_confidence:"high",p_stable_external_id:identity.id});if(verified.error)throw verified.error;}
    console.info("social_automation",{event:"connection_established",provider:raw,connectionId:result.data.id});
    return NextResponse.redirect(new URL(`/dashboard/platforms?social=${raw}:connected`,request.url));
  }catch{return NextResponse.redirect(new URL(`/dashboard/platforms?social=${raw}:${adapter.availability}`,request.url));}
}

import {cookies} from "next/headers";
import {NextResponse} from "next/server";
import {getCreator,getViewer} from "@/lib/dal";
import {createAdminClient} from "@/lib/supabase/admin";
import {encryptSocialSecret} from "@/lib/social-secrets";
import {verifyOAuthState} from "@/lib/social-providers/oauth";
import {facebookProvider} from "@/lib/social-providers/providers/facebook";
import {fetchMetaAppUser} from "@/lib/providers/meta-server";
import {listMetaAssets,selectMetaAsset} from "@/lib/providers/meta-server";
import {createTraceId,debugStep} from "@/lib/debug";
import {canCreateProviderConnection,isConnectionLimitError} from "@/lib/provider-entitlements";
import {canonicalOAuthOrigin} from "@/lib/oauth-origin";

export async function GET(request:Request){
  const traceId=createTraceId("meta"),callback=debugStep("oauth","callback_started",{traceId,area:"meta_oauth",provider:"facebook"});
  const url=new URL(request.url),store=await cookies(),raw=store.get("meta_oauth")?.value;store.delete("meta_oauth");
  let saved:{nonce:string}|null=null;try{saved=raw?JSON.parse(raw):null;}catch{}
  const state=saved&&url.searchParams.get("state")?verifyOAuthState(url.searchParams.get("state")!,"facebook",saved.nonce):null,[user,creator]=await Promise.all([getViewer(),getCreator()]);
  if(!state||!user||!creator||state.userId!==user.id||state.creatorId!==creator.id){callback.failed(new Error("invalid_state"));return NextResponse.redirect(new URL("/dashboard/platforms?meta=invalid_state",request.url));}
  const finish=(status:string)=>NextResponse.redirect(new URL(state.returnTo==="onboarding"?`/onboarding/accounts?step=${state.role}&oauth=facebook:${status}`:`/dashboard/platforms?social=facebook:${status}`,canonicalOAuthOrigin()??request.url));
  const code=url.searchParams.get("code"),db=createAdminClient();if(!code||url.searchParams.has("error"))return finish("authorization_failed");if(!db||!facebookProvider.exchangeAuthorizationCode)return finish("connection_failed");
  let insertedId:string|null=null;
  try{
    const exchange=debugStep("oauth","token_exchange",{traceId,area:"meta_oauth",provider:"facebook",role:state.role,connectionId:state.connectionId??null});
    const tokens=await facebookProvider.exchangeAuthorizationCode({code});exchange.success();
    const entitlement=await canCreateProviderConnection(creator.id,state.role,state.connectionId?"reconnect":"new_connection",user);if(!entitlement.allowed)return finish("connection_limit_reached");
    const appUser=await fetchMetaAppUser(tokens.accessToken),values={creator_id:creator.id,platform:"facebook" as const,account_type:state.role,protected_official_account_id:state.role==="backup"?state.protectedOfficialAccountId??null:null,label:"Meta asset access",url:"https://www.facebook.com/",is_primary:false,is_public:false,external_account_id:null,external_account_name:appUser.name,external_account_url:null,provider_metadata:{loginMethod:"facebook_login",assetSelectionRequired:true,reconnectTargetId:state.connectionId??null,protectedOfficialAccountId:state.protectedOfficialAccountId??null},requested_scopes:facebookProvider.requestedScopes,granted_scopes:tokens.grantedScopes,watch_enabled:false,auto_create_drafts:true,auto_send:false,webhook_enabled:false,connection_health:"healthy",provider_status:"asset_selection_required",token_expires_at:tokens.expiresAt,token_refreshed_at:new Date().toISOString()};
    const result=await db.from("connected_accounts").insert(values).select("id").single();if(result.error)throw result.error;insertedId=result.data.id;
    const savedSecret=await db.from("platform_connection_secrets").upsert({platform_connection_id:insertedId,access_token_ciphertext:encryptSocialSecret(tokens.accessToken),refresh_token_ciphertext:tokens.refreshToken?encryptSocialSecret(tokens.refreshToken):null,token_scope:tokens.grantedScopes.join(" "),token_type:tokens.tokenType});if(savedSecret.error)throw savedSecret.error;
    const assets=(await listMetaAssets(creator.id,insertedId)).filter(asset=>asset.provider==="facebook");
    if(!assets.length){await db.from("connected_accounts").delete().eq("id",insertedId).eq("creator_id",creator.id);insertedId=null;return finish("no_eligible_pages");}
    if(assets.length===1){await selectMetaAsset(creator.id,insertedId,"facebook",assets[0].selectionKey);callback.success({connectionId:insertedId,role:state.role,automaticSelection:true});return finish("connected");}
    callback.success({connectionId:insertedId,role:state.role,automaticSelection:false,selectionRequired:true});return finish("selection_required");
  }catch(error){if(insertedId)await db.from("connected_accounts").delete().eq("id",insertedId).eq("creator_id",creator.id);callback.failed(error,{connectionId:insertedId});return finish(isConnectionLimitError(error)?"connection_limit_reached":"connection_failed");}
}

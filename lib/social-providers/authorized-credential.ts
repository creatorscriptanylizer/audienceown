import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { decryptSocialSecret,encryptSocialSecret } from "@/lib/social-secrets";
import { ProviderReliabilityError,normalizeProviderFailure,type ProviderFailureCategory } from "./errors";
import type { SocialProviderAdapter } from "./types";
import { createTraceId, debugStep } from "@/lib/debug";

type Admin=SupabaseClient<Database>;
type ConnectionCredentialState={id:string;creator_id:string;external_account_id:string|null;token_expires_at:string|null;lease_owner:string|null;lease_expires_at:string|null;provider_metadata:unknown;granted_scopes:string[];capability_state:unknown};
export type AuthorizedCredential={accessToken:string;refreshToken?:string;refreshed:boolean};

function reliabilityState(value:unknown){const root=value&&typeof value==="object"?value as Record<string,unknown>:{};const reliability=root.reliability&&typeof root.reliability==="object"?root.reliability as Record<string,unknown>:{};return{root,reliability};}
export function providerConnectionReference(connectionId:string){return createHash("sha256").update(connectionId).digest("base64url").slice(0,12);}
export function logProviderOperation(event:string,input:{provider:string;connectionId:string;category?:ProviderFailureCategory;code?:string;attempt?:number}){
  const payload={event,provider:input.provider,connectionRef:providerConnectionReference(input.connectionId),category:input.category,code:input.code,attempt:input.attempt};
  if(event.includes("failed")||event.includes("required")||event.includes("revoked"))console.warn("provider_sync",payload);else console.info("provider_sync",payload);
}

async function secretFor(db:Admin,connectionId:string){const{data,error}=await db.from("platform_connection_secrets").select("access_token_ciphertext,refresh_token_ciphertext").eq("platform_connection_id",connectionId).maybeSingle();if(error)throw new ProviderReliabilityError("persistence","credential_read_failed",true);if(!data)throw new ProviderReliabilityError("authentication","missing_provider_credentials",false,true);return data;}
async function releaseLease(db:Admin,connectionId:string,owner:string){await db.from("connected_accounts").update({lease_owner:null,lease_expires_at:null}).eq("id",connectionId).eq("lease_owner",owner);}

export async function authorizedProviderCredential(input:{db:Admin;connection:ConnectionCredentialState;adapter:SocialProviderAdapter;leaseOwner:string;traceId?:string;now?:number;fetchLeewayMs?:number}):Promise<AuthorizedCredential>{
  const{db,adapter,leaseOwner}=input,now=input.now??Date.now(),leeway=input.fetchLeewayMs??60_000,initialSecret=await secretFor(db,input.connection.id);
  const diagnosticContext={traceId:input.traceId??createTraceId("sync"),area:"provider_sync",provider:adapter.provider,connectionId:input.connection.id,creatorId:input.connection.creator_id};
  const expiresAt=input.connection.token_expires_at?Date.parse(input.connection.token_expires_at):null;
  let validationFailed=false;
  if(!expiresAt||expiresAt>now+leeway){const diagnostic=debugStep("sync","credential_decrypt",diagnosticContext);try{const credential={accessToken:decryptSocialSecret(initialSecret.access_token_ciphertext),refreshToken:initialSecret.refresh_token_ciphertext?decryptSocialSecret(initialSecret.refresh_token_ciphertext):undefined,refreshed:false as const};if(adapter.validateAccessToken){const validation=debugStep("sync","token_validation",diagnosticContext);try{if(await adapter.validateAccessToken({accessToken:credential.accessToken,refreshToken:credential.refreshToken,metadata:{externalAccountId:input.connection.external_account_id}})){validation.success();diagnostic.success();return credential;}validationFailed=true;validation.failed(new Error("oauth_authorization_invalid"));}catch(error){validation.failed(error);throw error;}}else{diagnostic.success();return credential;}}catch(error){diagnostic.failed(error);throw error;}}
  if(!adapter.refreshAccessToken)throw new ProviderReliabilityError("authentication","token_refresh_unsupported",false,true);
  const alreadyOwned=input.connection.lease_owner===leaseOwner&&Boolean(input.connection.lease_expires_at&&Date.parse(input.connection.lease_expires_at)>now);
  const leaseUntil=new Date(now+120_000).toISOString(),nowIso=new Date(now).toISOString();
  if(!alreadyOwned){const claim=await db.from("connected_accounts").update({lease_owner:leaseOwner,lease_expires_at:leaseUntil}).eq("id",input.connection.id).eq("creator_id",input.connection.creator_id).or(`lease_owner.is.null,lease_expires_at.lt.${nowIso}`).select("id").maybeSingle();if(claim.error)throw new ProviderReliabilityError("persistence","refresh_lease_failed",true);if(!claim.data)throw new ProviderReliabilityError("temporary_provider","refresh_in_progress",true);}
  try{
    const[{data:current,error:connectionError},currentSecret]=await Promise.all([db.from("connected_accounts").select("token_expires_at,granted_scopes,provider_metadata,capability_state").eq("id",input.connection.id).maybeSingle(),secretFor(db,input.connection.id)]);
    if(connectionError||!current)throw new ProviderReliabilityError("persistence","connection_refresh_read_failed",true);
    const currentExpiry=current.token_expires_at?Date.parse(current.token_expires_at):null;
    if(!validationFailed&&currentExpiry&&currentExpiry>now+leeway)return{accessToken:decryptSocialSecret(currentSecret.access_token_ciphertext),refreshToken:currentSecret.refresh_token_ciphertext?decryptSocialSecret(currentSecret.refresh_token_ciphertext):undefined,refreshed:false};
    if(!currentSecret.refresh_token_ciphertext)throw new ProviderReliabilityError("authentication","missing_refresh_token",false,true);
    const oldRefresh=decryptSocialSecret(currentSecret.refresh_token_ciphertext),oldAccess=decryptSocialSecret(currentSecret.access_token_ciphertext);
    const refreshDiagnostic=debugStep("sync","token_refresh",diagnosticContext);
    let token:Awaited<ReturnType<NonNullable<SocialProviderAdapter["refreshAccessToken"]>>>;
    try{token=await adapter.refreshAccessToken({accessToken:oldAccess,refreshToken:oldRefresh,metadata:{...(current.provider_metadata as Record<string,unknown>),externalAccountId:input.connection.external_account_id}});refreshDiagnostic.success();}catch(error){refreshDiagnostic.failed(error);throw error;}
    if(!token.accessToken||!token.expiresAt)throw new ProviderReliabilityError("invalid_response","refresh_response_incomplete",false);
    const refreshToken=token.refreshToken??oldRefresh,grantedScopes=token.grantedScopes.length?token.grantedScopes:current.granted_scopes;
    const secretWrite=await db.from("platform_connection_secrets").update({access_token_ciphertext:encryptSocialSecret(token.accessToken),refresh_token_ciphertext:encryptSocialSecret(refreshToken),token_scope:grantedScopes.join(" "),token_type:token.tokenType}).eq("platform_connection_id",input.connection.id);
    if(secretWrite.error)throw new ProviderReliabilityError("persistence","credential_write_failed",true);
    const{root}=reliabilityState(current.capability_state),providerMetadata={...(current.provider_metadata as Record<string,unknown>),...(token.refreshTokenExpiresAt?{refreshTokenExpiresAt:token.refreshTokenExpiresAt}:{})};const accountWrite=await db.from("connected_accounts").update({token_expires_at:token.expiresAt,token_refreshed_at:nowIso,granted_scopes:grantedScopes,provider_metadata:providerMetadata,capability_state:{...root,reliability:{consecutiveFailures:0,lastFailureCategory:null,lastFailureCode:null,rateLimitedUntil:null,lastTokenRefreshAt:nowIso}}}).eq("id",input.connection.id).eq("creator_id",input.connection.creator_id);
    if(accountWrite.error)throw new ProviderReliabilityError("persistence","connection_token_write_failed",true);
    logProviderOperation("token_refreshed",{provider:adapter.provider,connectionId:input.connection.id});
    return{accessToken:token.accessToken,refreshToken,refreshed:true};
  }catch(error){const failure=normalizeProviderFailure(error);logProviderOperation(failure.reconnectRequired?"reconnect_required":"token_refresh_failed",{provider:adapter.provider,connectionId:input.connection.id,category:failure.category,code:failure.code});throw error;
  }finally{if(!alreadyOwned)await releaseLease(db,input.connection.id,leaseOwner);}
}

import"server-only";import{createHash,randomUUID}from"node:crypto";import{createAdminClient}from"@/lib/supabase/admin";
import{decryptSocialSecret}from"@/lib/social-secrets";import{getSocialProvider}from"@/lib/social-providers/registry";import{socialProviders,type SocialProvider}from"@/lib/social-providers/types";
export class EmergencyVerificationError extends Error{constructor(public code:string){super(code);}}
function provider(value:string):SocialProvider{if(!socialProviders.includes(value as SocialProvider))throw new EmergencyVerificationError("provider_verification_unavailable");return value as SocialProvider;}
function confidence(method:string){return["provider_oauth","existing_connected_account","provider_api","domain_challenge"].includes(method)?"high":method==="profile_challenge"?"medium":"low";}
export async function verifyFromConnectedAccount(input:{creatorId:string;userId:string;emergencyId:string;replacementId:string;connectionId:string}){
 const db=createAdminClient();if(!db)throw new EmergencyVerificationError("verification_not_configured");
 const{data:replacement}=await db.from("emergency_replacement_accounts").select("*").eq("id",input.replacementId).eq("emergency_id",input.emergencyId).eq("creator_id",input.creatorId).single();
 const{data:connection}=await db.from("connected_accounts").select("*").eq("id",input.connectionId).eq("creator_id",input.creatorId).single();
 if(!replacement||!connection)throw new EmergencyVerificationError("replacement_or_connection_not_found");
 if(connection.platform!==replacement.provider)throw new EmergencyVerificationError("provider_identity_mismatch");
 if(!["healthy","degraded"].includes(connection.connection_health)||connection.provider_status!=="ready"||!connection.external_account_id)throw new EmergencyVerificationError("connected_account_unhealthy");
 const{data:affected}=await db.from("emergency_affected_accounts").select("stable_provider_account_id,provider").eq("emergency_id",input.emergencyId);
 if(affected?.some((a)=>a.provider===connection.platform&&a.stable_provider_account_id===connection.external_account_id))throw new EmergencyVerificationError("replacement_matches_affected_account");
 const adapter=getSocialProvider(provider(connection.platform));if(!adapter.emergencyVerification.connectedAccountVerification||!adapter.fetchEmergencyAccountIdentity)throw new EmergencyVerificationError(adapter.availability==="provider_review_required"?"provider_review_required":"provider_verification_unavailable");
 const{data:secret}=await db.from("platform_connection_secrets").select("access_token_ciphertext,refresh_token_ciphertext").eq("platform_connection_id",connection.id).single();
 if(!secret)throw new EmergencyVerificationError("provider_scope_required");const providerMetadata=connection.provider_metadata;const identity=await adapter.fetchEmergencyAccountIdentity({accessToken:decryptSocialSecret(secret.access_token_ciphertext),refreshToken:secret.refresh_token_ciphertext?decryptSocialSecret(secret.refresh_token_ciphertext):undefined,metadata:providerMetadata&&typeof providerMetadata==="object"&&!Array.isArray(providerMetadata)?providerMetadata:undefined});
 if(!identity.id||identity.id!==connection.external_account_id)throw new EmergencyVerificationError("provider_identity_mismatch");
 const{data,error}=await db.rpc("record_emergency_verification",{p_replacement_id:replacement.id,p_method:"existing_connected_account",p_confidence:confidence("existing_connected_account"),p_external_id:identity.id,p_external_name:identity.name,p_canonical_url:identity.url,p_connected_account_id:connection.id,p_evidence:{source:"connected_account",requested_by:input.userId}});
 if(error)throw error;await db.rpc("sync_identity_account_from_emergency_replacement",{p_replacement_id:replacement.id});return{id:data,identity:{provider:connection.platform,externalAccountId:identity.id,name:identity.name,url:identity.url},confidence:"high"};
}
export function authorizationFingerprint(input:{userId:string;creatorId:string;emergencyId:string;purpose:string;revision:number},nonce=randomUUID()){
return{nonce,hash:createHash("sha256").update(`${input.userId}|${input.creatorId}|${input.emergencyId}|${input.purpose}|${input.revision}|${nonce}`).digest("hex")};}

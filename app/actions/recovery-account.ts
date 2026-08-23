"use server";

import{revalidatePath}from"next/cache";
import{z}from"zod";
import{requireCreator}from"@/lib/dal";
import{createAdminClient}from"@/lib/supabase/admin";
import{removeCreatorConnectedAccount}from"@/lib/connected-account-removal";
import{revalidateCreatorAccounts}from"@/lib/social-providers/creator-account-revalidation";
import{getSocialProvider}from"@/lib/social-providers/registry";
import{isSocialProvider}from"@/lib/social-providers/normalize";
import{decryptSocialSecret}from"@/lib/social-secrets";

export type RecoveryAccountRemovalState={success?:string;error?:string;removedNetworkCount?:number};
const failure="Unable to delete Recovery account. Try again.";

function safeFailureDetails(error:unknown){
  const source=error&&typeof error==="object"?error as{code?:unknown;constraint?:unknown;message?:unknown;details?:unknown}:{};
  const text=[source.message,source.details].filter((value):value is string=>typeof value==="string").join(" ");
  const match=text.match(/constraint ["']([^"']+)["']/i);
  return{safe_error_code:typeof source.code==="string"?source.code:error instanceof Error?error.message:"unknown",constraint:typeof source.constraint==="string"?source.constraint:match?.[1]??null};
}
function logRecoveryDeleteFailure(input:{stage:string;provider?:string;relationshipCount:number;error:unknown}){
  console.error({event:"recovery_account_delete_failed",stage:input.stage,...safeFailureDetails(input.error),account_role:"backup",provider:input.provider??"unknown",relationship_count:input.relationshipCount});
}

async function revokeProviderConnection(admin:NonNullable<ReturnType<typeof createAdminClient>>,connectionId:string,provider:string){
  if(provider==="youtube"||!isSocialProvider(provider))return;
  const adapter=getSocialProvider(provider);
  if(!adapter.capabilities.tokenRevocation||!adapter.revokeConnection)return;
  const{data,error}=await admin.from("platform_connection_secrets").select("access_token_ciphertext,refresh_token_ciphertext").eq("platform_connection_id",connectionId).maybeSingle();
  if(error)throw error;
  if(!data)return;
  await adapter.revokeConnection({accessToken:decryptSocialSecret(data.access_token_ciphertext),refreshToken:data.refresh_token_ciphertext?decryptSocialSecret(data.refresh_token_ciphertext):undefined});
}

export async function removeRecoveryAccount(connectionId:string):Promise<RecoveryAccountRemovalState>{
  const creator=await requireCreator();
  const parsed=z.string().uuid().safeParse(connectionId);
  if(!parsed.success)return{error:failure};
  const admin=createAdminClient();
  if(!admin)return{error:failure};
  let stage="authorize_target",provider:string|undefined,relationshipCount=0;
  try{
    const owned=await admin.from("connected_accounts").select("id,platform").eq("id",parsed.data).eq("creator_id",creator.id).eq("account_type","backup").maybeSingle();
    if(owned.error||!owned.data){logRecoveryDeleteFailure({stage,relationshipCount,error:owned.error??new Error("owned_recovery_not_found")});return{error:failure};}
    provider=owned.data.platform;
    stage="load_network_impact";
    const links=await admin.from("recovery_network_destinations").select("recovery_network_id",{count:"exact",head:true}).eq("recovery_connected_account_id",owned.data.id);
    if(links.error)throw links.error;
    relationshipCount=links.count??0;
    stage="provider_revocation";
    try{await revokeProviderConnection(admin,owned.data.id,owned.data.platform);}catch(error){
      // Remote revocation is best-effort for non-YouTube providers. Local token
      // deletion below is the security boundary and must not be blocked by a
      // stale/already-revoked token or a temporarily unavailable provider.
      logRecoveryDeleteFailure({stage,provider,relationshipCount,error});
    }
    stage="remove_connection";
    const result=await removeCreatorConnectedAccount(admin,creator.id,owned.data.id);
    if(result.status!=="disconnected"){logRecoveryDeleteFailure({stage,provider,relationshipCount,error:new Error(result.status)});return{error:failure};}
    stage="revalidation";
    revalidateCreatorAccounts(creator.id);
    revalidatePath("/dashboard/emergency");
    revalidatePath(`/c/${creator.public_slug}`);
    return{success:"Recovery account deleted",removedNetworkCount:links.count??0};
  }catch(error){logRecoveryDeleteFailure({stage,provider,relationshipCount,error});return{error:failure};}
}

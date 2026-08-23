import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { canonicalAccountConnected, resolveConnectionStatus } from "./connection-health";
import { assignMainToRecoveryNetwork } from "./recovery-network-main-assignment";

type Admin=SupabaseClient<Database>;
export type RecoveryAutoLinkResult="absent"|"linked"|"existing"|"failed";

function safeLog(event:string,input:{provider:string;role:string;result?:string;failureCategory?:string}){
  const payload={event,provider:input.provider,role:input.role,...(input.result?{result:input.result}:{}),...(input.failureCategory?{failureCategory:input.failureCategory}:{})};
  if(event.endsWith("failed"))console.warn("provider_oauth",payload);else console.info("provider_oauth",payload);
}

export async function validateRecoveryMainContext(db:Admin,input:{creatorId:string;mainAccountId:string}){
  const{data,error}=await db.from("connected_accounts").select("id,url,external_account_id,connection_health,provider_status").eq("id",input.mainAccountId).eq("creator_id",input.creatorId).eq("account_type","official").maybeSingle();
  if(error||!data)return false;
  const connected=canonicalAccountConnected({health:data.connection_health,providerStatus:data.provider_status,hasPublicUrl:Boolean(data.url),hasExternalAccountId:Boolean(data.external_account_id)});
  return connected&&!resolveConnectionStatus({health:data.connection_health,providerStatus:data.provider_status,canonicalConnected:connected}).actionRequired;
}

async function applyRecoveryAutoLinkIntentUnchecked(db:Admin,input:{creatorId:string;connectedAccountId:string;provider:string;role:"official"|"backup";recoveryForMainAccountId?:string}):Promise<RecoveryAutoLinkResult>{
  if(!input.recoveryForMainAccountId)return"absent";
  if(input.role==="official"){const assigned=await assignMainToRecoveryNetwork(db,{creatorId:input.creatorId,recoveryNetworkId:input.recoveryForMainAccountId,mainAccountId:input.connectedAccountId,role:input.role});return assigned==="assigned"?"linked":"failed";}
  safeLog("recovery_auto_link_intent_present",input);safeLog("recovery_auto_link_validation_started",input);
  if(input.role!=="backup"){safeLog("recovery_auto_link_failed",{...input,failureCategory:"role_mismatch"});return"failed";}
  const mainContextValid=await validateRecoveryMainContext(db,{creatorId:input.creatorId,mainAccountId:input.recoveryForMainAccountId});
  const{data:recovery,error}=await db.from("connected_accounts").select("id,platform,account_type,url,external_account_id,connection_health,provider_status").eq("id",input.connectedAccountId).eq("creator_id",input.creatorId).maybeSingle();
  if(error||!recovery||recovery.account_type!=="backup"||recovery.platform!==input.provider||recovery.id===input.recoveryForMainAccountId){safeLog("recovery_auto_link_failed",{...input,failureCategory:"recovery_mismatch"});return"failed";}
  const connected=canonicalAccountConnected({health:recovery.connection_health,providerStatus:recovery.provider_status,hasPublicUrl:Boolean(recovery.url),hasExternalAccountId:Boolean(recovery.external_account_id)});
  if(!connected){safeLog("recovery_auto_link_failed",{...input,failureCategory:"recovery_unavailable"});return"failed";}
  const byMain=mainContextValid?await db.from("recovery_networks").select("id").eq("creator_id",input.creatorId).eq("main_connected_account_id",input.recoveryForMainAccountId).maybeSingle():{data:null,error:null},byNetwork=byMain.data?byMain:await db.from("recovery_networks").select("id").eq("creator_id",input.creatorId).eq("id",input.recoveryForMainAccountId).maybeSingle(),network=byNetwork.data;
  if(byNetwork.error||!network){safeLog("recovery_auto_link_failed",{...input,failureCategory:"network_lookup"});return"failed";}
  const existing=await db.from("recovery_network_destinations").select("recovery_network_id").eq("recovery_connected_account_id",recovery.id).maybeSingle();
  if(existing.error){safeLog("recovery_auto_link_failed",{...input,failureCategory:"relationship_lookup"});return"failed";}if(existing.data?.recovery_network_id===network.id){safeLog("recovery_auto_link_existing",{...input,result:"existing"});return"existing";}if(existing.data){safeLog("recovery_auto_link_failed",{...input,failureCategory:"already_assigned"});return"failed";}
  const{error:assignmentError}=await db.rpc("assign_recovery_account_to_network",{p_creator_id:input.creatorId,p_recovery_network_id:network.id,p_recovery_account_id:recovery.id});
  if(assignmentError){safeLog("recovery_auto_link_failed",{...input,failureCategory:assignmentError.message?.includes("recovery_account_already_assigned")?"already_assigned":"relationship_write"});return"failed";}safeLog("recovery_auto_link_succeeded",{...input,result:"linked"});return"linked";
}

export async function applyRecoveryAutoLinkIntent(db:Admin,input:{creatorId:string;connectedAccountId:string;provider:string;role:"official"|"backup";recoveryForMainAccountId?:string}):Promise<RecoveryAutoLinkResult>{
  if(!input.recoveryForMainAccountId)return"absent";
  try{return await applyRecoveryAutoLinkIntentUnchecked(db,input);}
  catch{safeLog("recovery_auto_link_failed",{...input,failureCategory:"unexpected"});return"failed";}
}

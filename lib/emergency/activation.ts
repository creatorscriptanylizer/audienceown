import"server-only";import{publishDeliveryQueue}from"@/lib/update-delivery";import type{Database}from"@/lib/database.types";
import type{SupabaseClient}from"@supabase/supabase-js";
export async function activateAndDeliverEmergency(emergencyId:string,client:SupabaseClient<Database>,authorizationSessionId?:string){
const{data,error}=await client.rpc("activate_emergency",{p_emergency_id:emergencyId,p_authorization_session_id:authorizationSessionId??null});if(error)throw error;
const result=data as{creator_update_id:string;creator_id:string;status:string};const delivery=await publishDeliveryQueue(result.creator_update_id,result.creator_id,null,client);
return{...result,delivery};}

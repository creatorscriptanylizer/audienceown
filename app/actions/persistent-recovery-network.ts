"use server";

import{revalidatePath}from"next/cache";
import{z}from"zod";
import{requireCreator}from"@/lib/dal";
import{createClient}from"@/lib/supabase/server";

export type PersistentRecoveryNetworkState={success?:string;error?:string;recoveryNetworkId?:string;recoveryAccountIds?:string[]};

export async function savePersistentRecoveryNetwork(_:PersistentRecoveryNetworkState,formData:FormData):Promise<PersistentRecoveryNetworkState>{
  const creator=await requireCreator();
  const parsed=z.object({recoveryNetworkId:z.string().uuid(),recoveryAccountIds:z.array(z.string().uuid()).max(50)}).safeParse({recoveryNetworkId:formData.get("recovery_network_id"),recoveryAccountIds:formData.getAll("recovery_account_ids")});
  if(!parsed.success)return{error:"Choose valid recovery accounts."};
  const db=await createClient();if(!db)return{error:"Recovery network changes could not be saved."};
  const{error}=await db.rpc("set_recovery_network_destinations",{p_creator_id:creator.id,p_recovery_network_id:parsed.data.recoveryNetworkId,p_recovery_account_ids:parsed.data.recoveryAccountIds});
  if(error)return{error:error.message?.includes("recovery_account_already_assigned")?"A Recovery account is already assigned to another Recovery Network.":error.code==="42501"?"Recovery Network not found.":"Recovery network changes could not be saved."};
  revalidatePath("/dashboard/platforms");revalidatePath("/dashboard/emergency");revalidatePath(`/c/${creator.public_slug}`);revalidatePath(`/verify/${creator.public_slug}`);revalidatePath("/dashboard/authenticity");
  return{success:"Recovery network saved.",recoveryNetworkId:parsed.data.recoveryNetworkId,recoveryAccountIds:parsed.data.recoveryAccountIds};
}

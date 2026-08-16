import "server-only";
import { createClient } from "@/lib/supabase/server";
import { slugSchema } from "@/lib/validation";

export type CreatorSlugAvailabilityResult =
  | {status:"available";normalizedName:string}
  | {status:"taken"|"reserved"|"invalid";normalizedName:string;message:string}
  | {status:"error";normalizedName:string;code:"availability_check_failed";message:string};

function debugAvailability(details:Record<string,unknown>){
  if(process.env.AUDIENCEOWN_DEBUG==="1")console.info(`recovery_pass_name_check ${JSON.stringify(details)}`);
}

export async function checkRecoveryPassNameAvailability(rawName:string):Promise<CreatorSlugAvailabilityResult>{
  const normalizedName=rawName.trim().toLowerCase().replaceAll("_","-");
  const parsed=slugSchema.safeParse(normalizedName);
  if(!parsed.success){
    const message=parsed.error.issues[0]?.message??"Invalid creator name.";
    const status=message.toLowerCase().includes("reserved")?"reserved"as const:"invalid"as const;
    debugAvailability({normalizedName,step:"validation_complete",result:status});
    return{status,normalizedName,message};
  }
  debugAvailability({normalizedName:parsed.data,step:"query_start"});
  const db=await createClient();
  if(!db){
    debugAvailability({normalizedName:parsed.data,step:"query_failed",code:"CLIENT_NOT_CONFIGURED",message:"Authenticated database client unavailable."});
    return{status:"error",normalizedName:parsed.data,code:"availability_check_failed",message:"We couldn't check this name right now."};
  }
  const{data,error}=await db.rpc("check_recovery_pass_name_availability"as never,{p_slug:parsed.data}as never)as unknown as{data:string|null;error:null|{code?:string;message?:string}};
  if(error||!(data==="available"||data==="taken")){
    debugAvailability({normalizedName:parsed.data,step:"query_failed",code:error?.code??"INVALID_RPC_RESPONSE",message:error?.message??"Availability RPC returned an invalid response."});
    return{status:"error",normalizedName:parsed.data,code:"availability_check_failed",message:"We couldn't check this name right now."};
  }
  debugAvailability({normalizedName:parsed.data,step:"query_complete",result:data});
  return data==="available"?{status:"available",normalizedName:parsed.data}:{status:"taken",normalizedName:parsed.data,message:"Username already taken."};
}

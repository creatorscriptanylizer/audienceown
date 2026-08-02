import { getCreator } from "@/lib/dal";import { createClient } from "@/lib/supabase/server";import { createAdminClient } from "@/lib/supabase/admin";
import { isSocialProvider } from "@/lib/social-providers/normalize";
import { revalidateCreatorAccounts } from "@/lib/social-providers/creator-account-revalidation";
export async function POST(_request:Request,{params}:{params:Promise<{provider:string}>}){
  const{provider}=await params;if(!isSocialProvider(provider))return Response.json({error:"Unknown provider"},{status:404});
  const creator=await getCreator();if(!creator)return Response.json({error:"Unauthorized"},{status:401});const client=await createClient();
  const{data}=await client!.from("connected_accounts").update({watch_enabled:false,auto_send:false,connection_health:"disconnected"})
    .eq("creator_id",creator.id).eq("platform",provider).select("id").maybeSingle();if(!data)return Response.json({error:"Not found"},{status:404});
  await createAdminClient()?.from("platform_connection_secrets").delete().eq("platform_connection_id",data.id);revalidateCreatorAccounts(creator.id);return Response.json({status:"disconnected"});
}

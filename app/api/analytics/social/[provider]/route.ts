import { getCreator } from "@/lib/dal";import { createClient } from "@/lib/supabase/server";import { isSocialProvider } from "@/lib/social-providers/normalize";
export async function GET(_request:Request,{params}:{params:Promise<{provider:string}>}){const{provider}=await params;
if(!isSocialProvider(provider))return Response.json({error:"Unknown provider"},{status:404});if(!await getCreator())return Response.json({error:"Unauthorized"},{status:401});
const client=await createClient();const{data,error}=await client!.rpc("get_social_automation_analytics",{p_provider:provider});
return error?Response.json({error:"Analytics unavailable"},{status:500}):Response.json(data,{headers:{"cache-control":"private, no-store"}});}

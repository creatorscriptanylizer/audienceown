import { getCreator } from "@/lib/dal";import { createClient } from "@/lib/supabase/server";
export async function GET(){if(!await getCreator())return Response.json({error:"Unauthorized"},{status:401});const client=await createClient();
const{data,error}=await client!.rpc("get_social_automation_analytics",{});return error?Response.json({error:"Analytics unavailable"},{status:500}):Response.json(data,{headers:{"cache-control":"private, no-store"}});}

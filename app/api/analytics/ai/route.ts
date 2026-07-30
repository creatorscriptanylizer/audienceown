import{getCreator}from"@/lib/dal";import{createClient}from"@/lib/supabase/server";
export async function GET(){if(!await getCreator())return Response.json({error:"Unauthorized"},{status:401});const client=await createClient();const{data,error}=await client!.rpc("get_ai_usage_summary");
return error?Response.json({error:"AI analytics unavailable"},{status:500}):Response.json(data,{headers:{"cache-control":"private, no-store"}});}

import{createClient}from"@/lib/supabase/server";import{getCreator}from"@/lib/dal";
export async function GET(){const creator=await getCreator(),db=await createClient();if(!creator||!db)return Response.json({error:"Unauthorized"},{status:401});const{data,error}=await db.rpc("get_creator_ecosystem_graph");return error?Response.json({error:"Ecosystem graph unavailable"},{status:500}):Response.json(data,{headers:{"cache-control":"no-store"}});}


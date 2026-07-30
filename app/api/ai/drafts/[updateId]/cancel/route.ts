import{getCreator}from"@/lib/dal";import{createClient}from"@/lib/supabase/server";
export async function POST(_request:Request,{params}:{params:Promise<{updateId:string}>}){const{updateId}=await params;if(!await getCreator())return Response.json({error:"Unauthorized"},{status:401});
const client=await createClient();const{data,error}=await client!.rpc("cancel_ai_draft_enhancement",{p_update_id:updateId});
return error?Response.json({error:"Enhancement could not be cancelled"},{status:400}):Response.json(data);}

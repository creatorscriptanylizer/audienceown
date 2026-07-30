import{getCreator}from"@/lib/dal";import{createClient}from"@/lib/supabase/server";import{AI_PROMPT_VERSION}from"@/lib/ai/configuration";import{draftVariantTypes}from"@/lib/ai/types";
export async function POST(_request:Request,{params}:{params:Promise<{updateId:string}>}){const{updateId}=await params,creator=await getCreator();
if(!creator)return Response.json({error:"Unauthorized"},{status:401});const client=await createClient();const{data:owned}=await client!.from("creator_updates").select("id").eq("id",updateId).eq("creator_id",creator.id).eq("status","draft").maybeSingle();
if(!owned)return Response.json({error:"Draft unavailable"},{status:404});const{data,error}=await client!.rpc("enqueue_ai_draft_enhancement",{p_update_id:updateId,p_prompt_version:AI_PROMPT_VERSION,p_requested_variants:[...draftVariantTypes],p_auto_send_requested:false});
return error?Response.json({error:"Enhancement could not be queued"},{status:500}):Response.json(data,{status:202});}

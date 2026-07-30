import{getCreator}from"@/lib/dal";import{createClient}from"@/lib/supabase/server";
export async function GET(_request:Request,{params}:{params:Promise<{updateId:string}>}){const{updateId}=await params,creator=await getCreator();if(!creator)return Response.json({error:"Unauthorized"},{status:401});
const client=await createClient();const{data:update}=await client!.from("creator_updates").select("id,deterministic_title,deterministic_content,content_revision").eq("id",updateId).eq("creator_id",creator.id).maybeSingle();
if(!update)return Response.json({error:"Draft unavailable"},{status:404});const[{data:jobs},{data:variants}]=await Promise.all([
client!.from("ai_draft_enhancement_jobs").select("id,status,prompt_version,stale_result,result_applied,last_error_code,created_at,completed_at").eq("creator_update_id",updateId).order("created_at",{ascending:false}),
client!.from("ai_draft_variants").select("id,variant_type,title,body,call_to_action,source_url,provider,model,prompt_version,selected,created_at").eq("creator_update_id",updateId).order("created_at")]);
return Response.json({original:{title:update.deterministic_title,body:update.deterministic_content},jobs:jobs??[],variants:variants??[]},{headers:{"cache-control":"private, no-store"}});}

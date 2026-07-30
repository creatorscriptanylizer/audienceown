import{getCreator}from"@/lib/dal";import{createClient}from"@/lib/supabase/server";
export async function POST(_request:Request,{params}:{params:Promise<{updateId:string}>}){const{updateId}=await params,creator=await getCreator();if(!creator)return Response.json({error:"Unauthorized"},{status:401});
const client=await createClient();const{data:update}=await client!.from("creator_updates").select("deterministic_title,deterministic_content").eq("id",updateId).eq("creator_id",creator.id).eq("status","draft").maybeSingle();
if(!update?.deterministic_title||!update.deterministic_content)return Response.json({error:"Original draft unavailable"},{status:404});
const{error}=await client!.from("creator_updates").update({title:update.deterministic_title,subject:update.deterministic_title.slice(0,160),
preview_text:update.deterministic_content.slice(0,200),content:update.deterministic_content,ai_enhanced_at:null,ai_prompt_version:null}).eq("id",updateId).eq("creator_id",creator.id).eq("status","draft");
return error?Response.json({error:"Original could not be restored"},{status:400}):Response.json({status:"restored"});}

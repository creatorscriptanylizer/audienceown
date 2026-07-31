import"server-only";import{getCreator,getViewer}from"@/lib/dal";import{createClient}from"@/lib/supabase/server";
export async function emergencyApiContext(){const[creator,user,client]=await Promise.all([getCreator(),getViewer(),createClient()]);
if(!user||!client)return null;if(creator)return{creator,user,client};const{data:membership}=await client.from("creator_team_members").select("creator_id").eq("user_id",user.id).limit(1).maybeSingle();
if(!membership)return null;return{creator:{id:membership.creator_id},user,client};}
export function emergencyError(error:{code?:string}|null){if(error?.code==="42501")return Response.json({error:"Forbidden"},{status:403});
if(error?.code==="P0002")return Response.json({error:"Emergency not found"},{status:404});
if(error?.code==="23514"||error?.code==="55000")return Response.json({error:"Emergency action is not allowed"},{status:409});
return Response.json({error:"Emergency request failed"},{status:500});}

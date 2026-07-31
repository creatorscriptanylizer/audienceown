import{emergencyApiContext,emergencyError}from"@/lib/emergency/api";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){const{id}=await params,ctx=await emergencyApiContext();
if(!ctx)return Response.json({error:"Unauthorized"},{status:401});const{data,error}=await ctx.client.from("emergency_events").select("*").eq("emergency_id",id).order("id");
return error?emergencyError(error):Response.json({events:data},{headers:{"cache-control":"private, no-store"}});}


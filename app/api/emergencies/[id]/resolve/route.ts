import{emergencyApiContext,emergencyError}from"@/lib/emergency/api";
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){const{id}=await params,ctx=await emergencyApiContext();
if(!ctx)return Response.json({error:"Unauthorized"},{status:401});const{data,error}=await ctx.client.rpc("close_emergency",{p_emergency_id:id,p_action:"resolve"});
return error?emergencyError(error):Response.json(data);}


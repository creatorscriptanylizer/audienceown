import{emergencyApiContext,emergencyError}from"@/lib/emergency/api";import{activateAndDeliverEmergency}from"@/lib/emergency/activation";
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){const{id}=await params,ctx=await emergencyApiContext();
if(!ctx)return Response.json({error:"Unauthorized"},{status:401});try{return Response.json(await activateAndDeliverEmergency(id,ctx.client));}
catch(error){return emergencyError(error as{code?:string});}}


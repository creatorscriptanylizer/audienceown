import{emergencyApiContext,emergencyError}from"@/lib/emergency/api";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){const{id}=await params,ctx=await emergencyApiContext();
if(!ctx)return Response.json({error:"Unauthorized"},{status:401});let reason:null|string=null;try{const body=await request.json()as{reason?:unknown};
reason=typeof body.reason==="string"?body.reason.slice(0,500):null;}catch{}const{data,error}=await ctx.client.rpc("approve_emergency",{p_emergency_id:id,...(reason?{p_reason:reason}:{})});
return error?emergencyError(error):Response.json(data);}

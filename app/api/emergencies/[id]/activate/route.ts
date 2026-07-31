import{emergencyApiContext,emergencyError}from"@/lib/emergency/api";import{activateAndDeliverEmergency}from"@/lib/emergency/activation";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){const{id}=await params,ctx=await emergencyApiContext();
if(!ctx)return Response.json({error:"Unauthorized"},{status:401});let sessionId:string|undefined;try{const body=await request.json()as{authorization_session_id?:unknown};if(typeof body.authorization_session_id==="string")sessionId=body.authorization_session_id;}catch{}
try{return Response.json(await activateAndDeliverEmergency(id,ctx.client,sessionId));}
catch(error){return emergencyError(error as{code?:string});}}

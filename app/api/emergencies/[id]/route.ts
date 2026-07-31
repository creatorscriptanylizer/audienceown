import{emergencyApiContext,emergencyError}from"@/lib/emergency/api";import{emergencyUpdateSchema}from"@/lib/emergency/schemas";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){const{id}=await params,ctx=await emergencyApiContext();
if(!ctx)return Response.json({error:"Unauthorized"},{status:401});const{data,error}=await ctx.client.from("creator_emergencies")
.select("*,emergency_affected_accounts(*),emergency_replacement_accounts(*),emergency_approvals(*),emergency_alert_snapshots(*),emergency_events(*)")
.eq("id",id).maybeSingle();return error?emergencyError(error):data?Response.json({emergency:data},{headers:{"cache-control":"private, no-store"}}):Response.json({error:"Emergency not found"},{status:404});}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){const{id}=await params,ctx=await emergencyApiContext();
if(!ctx)return Response.json({error:"Unauthorized"},{status:401});let body:unknown;try{body=await request.json();}catch{return Response.json({error:"Invalid JSON"},{status:400});}
const parsed=emergencyUpdateSchema.safeParse(body);if(!parsed.success)return Response.json({error:"Invalid emergency",fields:parsed.error.flatten().fieldErrors},{status:400});
const{data,error}=await ctx.client.rpc("update_emergency",{p_emergency_id:id,p_type:parsed.data.emergency_type,p_severity:parsed.data.severity,
p_title:parsed.data.title,p_message:parsed.data.message});return error?emergencyError(error):Response.json(data);}


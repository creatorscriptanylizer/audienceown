import{emergencyApiContext,emergencyError}from"@/lib/emergency/api";import{emergencyInputSchema}from"@/lib/emergency/schemas";
export async function GET(){const ctx=await emergencyApiContext();if(!ctx)return Response.json({error:"Unauthorized"},{status:401});
const{data,error}=await ctx.client.from("creator_emergencies").select("*,emergency_affected_accounts(*),emergency_replacement_accounts(*)")
.eq("creator_id",ctx.creator.id).order("updated_at",{ascending:false});return error?emergencyError(error):Response.json({emergencies:data},{headers:{"cache-control":"private, no-store"}});}
export async function POST(request:Request){const ctx=await emergencyApiContext();if(!ctx)return Response.json({error:"Unauthorized"},{status:401});
let body:unknown;try{body=await request.json();}catch{return Response.json({error:"Invalid JSON"},{status:400});}
const parsed=emergencyInputSchema.safeParse(body);if(!parsed.success)return Response.json({error:"Invalid emergency",fields:parsed.error.flatten().fieldErrors},{status:400});
const{data,error}=await ctx.client.rpc("create_emergency",{p_type:parsed.data.emergency_type,p_severity:parsed.data.severity,p_title:parsed.data.title,
p_message:parsed.data.message,p_affected_account:parsed.data.affected_account_id});return error?emergencyError(error):Response.json({id:data},{status:201});}


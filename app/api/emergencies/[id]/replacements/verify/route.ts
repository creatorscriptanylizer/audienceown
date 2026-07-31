import{emergencyApiContext,emergencyError}from"@/lib/emergency/api";import{verificationSchema}from"@/lib/emergency/schemas";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){const{id}=await params,ctx=await emergencyApiContext();
if(!ctx)return Response.json({error:"Unauthorized"},{status:401});let body:unknown;try{body=await request.json();}catch{return Response.json({error:"Invalid JSON"},{status:400});}
const parsed=verificationSchema.safeParse(body);if(!parsed.success)return Response.json({error:"Invalid verification",fields:parsed.error.flatten().fieldErrors},{status:400});
const{data,error}=await ctx.client.rpc("verify_emergency_replacement",{p_emergency_id:id,p_provider:parsed.data.provider,p_account_id:parsed.data.stable_provider_account_id,
p_handle:parsed.data.display_handle,p_url:parsed.data.canonical_profile_url,p_method:parsed.data.verification_method,p_official:parsed.data.official});
return error?emergencyError(error):Response.json({id:data});}

import{z}from"zod";import{emergencyApiContext}from"@/lib/emergency/api";import{requireSameOrigin,emergencyRateLimit}from"@/lib/emergency/request-security";import{verifyFromConnectedAccount,EmergencyVerificationError}from"@/lib/emergency/verification-server";
export const runtime="nodejs";const schema=z.object({replacement_id:z.string().uuid(),connection_id:z.string().uuid()}).strict();
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){const{id}=await params,ctx=await emergencyApiContext();if(!ctx)return Response.json({error:"Unauthorized"},{status:401});
if(!requireSameOrigin(request))return Response.json({error:"Cross-origin request rejected"},{status:403});if(!emergencyRateLimit(`${ctx.user.id}:connected-verification`,6))return Response.json({error:"Verification rate limit exceeded"},{status:429});
let body;try{body=schema.parse(await request.json());}catch{return Response.json({error:"Invalid connected-account verification"},{status:400});}
try{return Response.json(await verifyFromConnectedAccount({creatorId:ctx.creator.id,userId:ctx.user.id,emergencyId:id,replacementId:body.replacement_id,connectionId:body.connection_id}));}
catch(error){const code=error instanceof EmergencyVerificationError?error.code:"verification_failed";return Response.json({error:code},{status:code.includes("not_found")?404:409});}}

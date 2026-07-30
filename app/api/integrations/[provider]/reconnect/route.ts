import { NextResponse } from "next/server";import { isSocialProvider } from "@/lib/social-providers/normalize";
export async function GET(request:Request,{params}:{params:Promise<{provider:string}>}){
  const{provider}=await params;if(!isSocialProvider(provider))return Response.json({error:"Unknown provider"},{status:404});
  return NextResponse.redirect(new URL(`/api/integrations/${provider}/connect`,request.url));
}

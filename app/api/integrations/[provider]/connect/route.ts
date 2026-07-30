import { randomBytes } from "node:crypto";import { cookies } from "next/headers";import { NextResponse } from "next/server";
import { getCreator,getViewer } from "@/lib/dal";import { createOAuthState,createPkce } from "@/lib/social-providers/oauth";
import { getSocialProvider } from "@/lib/social-providers/registry";import { isSocialProvider } from "@/lib/social-providers/normalize";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{provider:string}>}){
  const{provider:raw}=await params;if(!isSocialProvider(raw))return Response.json({error:"Unknown provider"},{status:404});
  const adapter=getSocialProvider(raw);if(!adapter.capabilities.oauth||!adapter.createAuthorizationUrl)
    return Response.json({error:"provider_capability_not_supported"},{status:409});
  const[user,creator]=await Promise.all([getViewer(),getCreator()]);if(!user||!creator)return NextResponse.redirect(new URL("/login?next=/dashboard/platforms",request.url));
  const nonce=randomBytes(24).toString("base64url");const pkce=["x","tiktok","pinterest"].includes(raw)?createPkce():null;
  const state=createOAuthState({creatorId:creator.id,userId:user.id,provider:raw,nonce,expiresAt:Date.now()+600000,codeChallenge:pkce?.challenge});
  const store=await cookies();store.set(`social_oauth_${raw}`,JSON.stringify({nonce,verifier:pkce?.verifier}),{httpOnly:true,
    secure:process.env.NODE_ENV==="production",sameSite:"lax",path:`/api/integrations/${raw}/callback`,maxAge:600});
  try{return NextResponse.redirect((await adapter.createAuthorizationUrl({state,codeChallenge:pkce?.challenge})).url);}
  catch{return NextResponse.redirect(new URL(`/dashboard/platforms?social=${raw}:configuration_pending`,request.url));}
}

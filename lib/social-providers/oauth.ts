import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { SocialProvider } from "./types";

export type SocialOAuthState = {
  creatorId:string;userId:string;provider:SocialProvider;nonce:string;expiresAt:number;codeChallenge?:string;
};
function secret(){const value=process.env.SOCIAL_OAUTH_STATE_SECRET??process.env.YOUTUBE_OAUTH_STATE_SECRET;
  if(!value)throw new Error("Social OAuth state is not configured.");return value;}
export function createOAuthState(payload:SocialOAuthState){const body=Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${createHmac("sha256",secret()).update(body).digest("base64url")}`;}
export function verifyOAuthState(value:string,provider:SocialProvider,nonce:string,now=Date.now()){
  try{const[body,sig]=value.split(".");const expected=createHmac("sha256",secret()).update(body).digest();
    const supplied=Buffer.from(sig,"base64url");if(expected.length!==supplied.length||!timingSafeEqual(expected,supplied))return null;
    const payload=JSON.parse(Buffer.from(body,"base64url").toString()) as SocialOAuthState;
    return payload.provider===provider&&payload.nonce===nonce&&payload.expiresAt>=now?payload:null;}catch{return null;}}
export function createPkce(){const verifier=randomBytes(48).toString("base64url");
  const challenge=createHash("sha256").update(verifier).digest("base64url");return{verifier,challenge};}

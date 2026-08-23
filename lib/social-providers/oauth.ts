import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { SocialProvider } from "./types";

export type SocialOAuthState = {
  creatorId:string;userId:string;provider:SocialProvider;nonce:string;role:"official"|"backup";connectionId?:string;protectedOfficialAccountId?:string;recoveryForMainAccountId?:string;recoveryNetworkId?:string;expiresAt:number;codeChallenge?:string;returnTo?:"onboarding";
};
export type OAuthStateValidationFailure = "state_signature_invalid"|"nonce_mismatch"|"state_expired"|"provider_mismatch"|"state_payload_invalid";
export type OAuthStateValidation = {ok:true;state:SocialOAuthState}|{ok:false;reason:OAuthStateValidationFailure};
function secret(){const value=process.env.SOCIAL_OAUTH_STATE_SECRET??process.env.YOUTUBE_OAUTH_STATE_SECRET;
  if(!value)throw new Error("Social OAuth state is not configured.");return value;}
export function createOAuthState(payload:SocialOAuthState){const body=Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${createHmac("sha256",secret()).update(body).digest("base64url")}`;}
export function validateOAuthState(value:string,provider:SocialProvider,nonce:string,now=Date.now()):OAuthStateValidation{
  try{const parts=value.split(".");if(parts.length!==2||!parts[0]||!parts[1])return{ok:false,reason:"state_signature_invalid"};const[body,sig]=parts;const expected=createHmac("sha256",secret()).update(body).digest();
    const supplied=Buffer.from(sig,"base64url");if(expected.length!==supplied.length||!timingSafeEqual(expected,supplied))return{ok:false,reason:"state_signature_invalid"};
    const payload=JSON.parse(Buffer.from(body,"base64url").toString()) as SocialOAuthState;
    const validRole=payload.role==="official"||payload.role==="backup",validConnection=payload.connectionId===undefined||/^[0-9a-f-]{36}$/i.test(payload.connectionId),validOfficial=payload.protectedOfficialAccountId===undefined||/^[0-9a-f-]{36}$/i.test(payload.protectedOfficialAccountId),validRecoveryMain=payload.recoveryForMainAccountId===undefined||/^[0-9a-f-]{36}$/i.test(payload.recoveryForMainAccountId),validNetwork=payload.recoveryNetworkId===undefined||/^[0-9a-f-]{36}$/i.test(payload.recoveryNetworkId),validReturn=payload.returnTo===undefined||payload.returnTo==="onboarding";
    if(!validRole||!validConnection||!validOfficial||!validRecoveryMain||!validNetwork||!validReturn||typeof payload.creatorId!=="string"||typeof payload.userId!=="string"||typeof payload.nonce!=="string"||typeof payload.expiresAt!=="number"||!Number.isFinite(payload.expiresAt)||payload.recoveryNetworkId!==undefined&&payload.role!=="official")return{ok:false,reason:"state_payload_invalid"};
    if(payload.provider!==provider)return{ok:false,reason:"provider_mismatch"};
    if(payload.expiresAt<now)return{ok:false,reason:"state_expired"};
    if(!(payload.nonce===nonce))return{ok:false,reason:"nonce_mismatch"};
    return{ok:true,state:payload};}catch{return{ok:false,reason:"state_signature_invalid"};}}
export function verifyOAuthState(value:string,provider:SocialProvider,nonce:string,now=Date.now()){
  const result=validateOAuthState(value,provider,nonce,now);return result.ok?result.state:null;}
export function createPkce(){const verifier=randomBytes(48).toString("base64url");
  const challenge=createHash("sha256").update(verifier).digest("base64url");return{verifier,challenge};}

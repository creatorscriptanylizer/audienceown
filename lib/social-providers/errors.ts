import type { SocialProvider } from "./types";

export type ProviderErrorCode =
  | "provider_capability_not_supported" | "provider_not_configured"
  | "provider_review_required" | "provider_plan_required" | "missing_approved_scope"
  | "invalid_grant" | "access_revoked" | "rate_limited" | "transient"
  | "malformed_provider_object" | "tiktok_identity_mismatch" | "webhook_verification_failed" | "webhook_replay";
export type ProviderFailureCategory = "configuration"|"authentication"|"authorization"|"rate_limit"|"temporary_provider"|"network"|"invalid_response"|"persistence"|"unknown";
export type NormalizedProviderFailure = { category:ProviderFailureCategory;code:string;retryable:boolean;reconnectRequired:boolean;retryAfterSeconds?:number;userMessage:string };

export class SocialProviderError extends Error {
  constructor(public code: ProviderErrorCode, public provider: SocialProvider, message: string, public retryAfterSeconds?: number) {
    super(message);
  }
}
export class ProviderReliabilityError extends Error {
  constructor(public category:ProviderFailureCategory,public code:string,public retryable:boolean,public reconnectRequired=false,public retryAfterSeconds?:number){super(code);}
}
export function unsupported(provider: SocialProvider, capability: string): never {
  throw new SocialProviderError("provider_capability_not_supported", provider, `${capability} is not supported for ${provider}.`);
}
export function isRetryableProviderError(error: unknown) {
  return error instanceof SocialProviderError && ["rate_limited","transient"].includes(error.code);
}

export function normalizeProviderFailure(error:unknown):NormalizedProviderFailure {
  if(error instanceof ProviderReliabilityError)return{category:error.category,code:error.code,retryable:error.retryable,reconnectRequired:error.reconnectRequired,retryAfterSeconds:error.retryAfterSeconds,userMessage:error.reconnectRequired?"Reconnect this platform to resume synchronization.":error.retryable?"Synchronization is temporarily unavailable. We will retry automatically.":"Synchronization could not continue. Review this connection."};
  const code=error instanceof SocialProviderError?error.code:error&&typeof error==="object"&&"code"in error&&typeof error.code==="string"?error.code:"unknown";
  const retryAfterSeconds=error instanceof SocialProviderError?error.retryAfterSeconds:error&&typeof error==="object"&&"retryAfterSeconds"in error&&typeof error.retryAfterSeconds==="number"?error.retryAfterSeconds:undefined;
  if(["invalid_grant","access_revoked","oauth_authorization_invalid","unauthorized","revoked","missing_refresh_token"].includes(code))return{category:"authentication",code,retryable:false,reconnectRequired:true,userMessage:"Reconnect this platform to resume synchronization."};
  if(["provider_not_configured","provider_capability_not_supported","provider_review_required","provider_plan_required","missing_approved_scope"].includes(code))return{category:"configuration",code,retryable:false,reconnectRequired:false,userMessage:"Automatic synchronization is not available for this connection."};
  if(["rate_limited","quota","oauth_rate_limited"].includes(code))return{category:"rate_limit",code,retryable:true,reconnectRequired:false,retryAfterSeconds,userMessage:"The provider is limiting requests. Synchronization will retry automatically."};
  if(["transient","oauth_temporary_failure","temporary_provider"].includes(code))return{category:"temporary_provider",code,retryable:true,reconnectRequired:false,retryAfterSeconds,userMessage:"The provider is temporarily unavailable. We will retry automatically."};
  if(["network","oauth_network_failure"].includes(code))return{category:"network",code,retryable:true,reconnectRequired:false,userMessage:"The provider could not be reached. We will retry automatically."};
  if(["malformed_provider_object","malformed","oauth_token_response_malformed","invalid_response"].includes(code))return{category:"invalid_response",code,retryable:false,reconnectRequired:false,userMessage:"The provider returned an incomplete response. Review this connection."};
  return{category:"unknown",code,retryable:false,reconnectRequired:false,userMessage:"Synchronization could not continue. Review this connection."};
}

export function providerRetryDelaySeconds(attempt:number,retryAfterSeconds?:number,jitter=Math.random()){
  const boundedAttempt=Math.max(1,Math.min(Math.trunc(attempt),8));
  const exponential=Math.min(3600,30*2**(boundedAttempt-1));
  const providerDelay=retryAfterSeconds&&Number.isFinite(retryAfterSeconds)?Math.max(1,Math.min(Math.trunc(retryAfterSeconds),86400)):0;
  return Math.max(providerDelay,Math.min(3600,exponential+Math.floor(Math.max(0,Math.min(jitter,0.999))*30)));
}

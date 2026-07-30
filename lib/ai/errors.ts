export type AiErrorCode="ai_disabled"|"missing_configuration"|"timeout"|"rate_limited"|"provider_unavailable"|"schema_invalid"|
"unsafe_output"|"budget_exhausted"|"monthly_limit_reached"|"draft_ineligible"|"invalid_instructions";
export class AiEnhancementError extends Error{constructor(public code:AiErrorCode,message:string,public retryable=false,public retryAfterSeconds?:number){super(message);}}

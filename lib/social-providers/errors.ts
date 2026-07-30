import type { SocialProvider } from "./types";

export type ProviderErrorCode =
  | "provider_capability_not_supported" | "provider_not_configured"
  | "provider_review_required" | "provider_plan_required" | "missing_approved_scope"
  | "invalid_grant" | "access_revoked" | "rate_limited" | "transient"
  | "malformed_provider_object" | "webhook_verification_failed" | "webhook_replay";

export class SocialProviderError extends Error {
  constructor(public code: ProviderErrorCode, public provider: SocialProvider, message: string, public retryAfterSeconds?: number) {
    super(message);
  }
}
export function unsupported(provider: SocialProvider, capability: string): never {
  throw new SocialProviderError("provider_capability_not_supported", provider, `${capability} is not supported for ${provider}.`);
}
export function isRetryableProviderError(error: unknown) {
  return error instanceof SocialProviderError && ["rate_limited","transient"].includes(error.code);
}

import { authorizationUrl, exchangeCode, refreshToken, revoke, type OAuthConfig } from "./base-oauth";
import { unsupported } from "./errors";
import type { ProviderAvailability, ProviderCapabilities, SocialProviderAdapter } from "./types";

export function oauthProvider(input: {
  config: OAuthConfig; displayName: string; capabilities: ProviderCapabilities;
  availability: ProviderAvailability; unavailableReason?: string;
  adapter?: Partial<SocialProviderAdapter>;
}): SocialProviderAdapter {
  const { config } = input;
  return {
    provider: config.provider, displayName: input.displayName, availability: input.availability,
    unavailableReason: input.unavailableReason, capabilities: input.capabilities,
    requestedScopes: config.scopes,
    emergencyVerification: input.adapter?.emergencyVerification ?? {
      oauthIdentityVerification:Boolean(input.adapter?.fetchIdentity),connectedAccountVerification:Boolean(input.adapter?.fetchIdentity),
      profileChallengeVerification:false,providerApiVerification:Boolean(input.adapter?.fetchIdentity),
    },
    async createAuthorizationUrl({ state, codeChallenge }) { return { url: authorizationUrl(config,state,codeChallenge) }; },
    exchangeAuthorizationCode: (context) => exchangeCode(config,context),
    refreshAccessToken: input.capabilities.tokenRefresh ? (input.adapter?.refreshAccessToken ?? ((context)=>refreshToken(config,context)))
      : async () => unsupported(config.provider,"token refresh"),
    revokeConnection: input.capabilities.tokenRevocation ? (input.adapter?.revokeConnection ?? ((context) => revoke(config,context)))
      : async () => unsupported(config.provider,"token revocation"),
    fetchIdentity: input.adapter?.fetchIdentity ?? (async () => unsupported(config.provider,"identity")),
    fetchEmergencyAccountIdentity: input.adapter?.fetchEmergencyAccountIdentity ?? input.adapter?.fetchIdentity,
    verifyEmergencyAccountOwnership: input.adapter?.verifyEmergencyAccountOwnership ?? input.adapter?.fetchIdentity,
    checkProfileChallenge: input.adapter?.checkProfileChallenge,
    pollContent: input.capabilities.polling ? input.adapter?.pollContent : async () => unsupported(config.provider,"polling"),
    verifyWebhook: input.capabilities.webhooks ? input.adapter?.verifyWebhook : async () => unsupported(config.provider,"webhooks"),
    normalizeWebhook: input.capabilities.webhooks ? input.adapter?.normalizeWebhook : async () => unsupported(config.provider,"webhooks"),
    normalizeContent: input.adapter?.normalizeContent,
    readiness:input.adapter?.readiness,
    discoverSources:input.adapter?.discoverSources,
    fetchContent:input.adapter?.fetchContent,
    fetchAuthoritativeDestinationState:input.adapter?.fetchAuthoritativeDestinationState,
    verifyOwnership:input.adapter?.verifyOwnership,
    calculateNextSync:input.adapter?.calculateNextSync,
    classifyError:input.adapter?.classifyError,
    manualImport:input.adapter?.manualImport,
    manualVerification:input.adapter?.manualVerification,
  };
}

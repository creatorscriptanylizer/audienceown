export const socialProviders = [
  "youtube", "instagram", "tiktok", "x", "spotify", "twitch", "linkedin",
  "facebook", "snapchat", "threads", "pinterest", "discord", "podcast", "rss",
] as const;
export type SocialProvider = typeof socialProviders[number];

export type ProviderCapabilities = {
  oauth: boolean; tokenRefresh: boolean; tokenRevocation: boolean; polling: boolean;
  webhooks: boolean; contentDetection: boolean; livestreamDetection: boolean;
  scheduledContentDetection: boolean; analytics: boolean; automaticDrafts: boolean;
  automaticPublishing: boolean; manualImport: boolean;
};
export type ProviderAvailability =
  | "implemented_credentials_required" | "provider_review_required"
  | "connection_only" | "manual_import_only" | "unsupported_official_api";
export type ProviderTokenSet = {
  accessToken: string; refreshToken?: string; expiresAt: string | null;
  grantedScopes: string[]; tokenType: string; stableIdentityId?: string;
};
export type ProviderIdentity = {
  id: string; name: string; url: string; metadata: Record<string, unknown>;
};
export type EmergencyVerificationCapabilities = {
  oauthIdentityVerification: boolean;
  connectedAccountVerification: boolean;
  profileChallengeVerification: boolean;
  providerApiVerification: boolean;
};
export type EmergencyVerificationContext = ProviderContext & {
  expectedAccountId?: string; challenge?: string; challengeLocation?: string;
};
export type NormalizedSocialContent = {
  provider: SocialProvider; externalObjectId: string; externalEventId?: string;
  objectType: "video" | "short_video" | "livestream" | "post" | "image" | "carousel"
    | "audio_release" | "podcast_episode" | "pin" | "message" | "article";
  eventType: "published" | "scheduled" | "live_started" | "live_ended" | "updated" | "deleted";
  title: string | null; description: string | null; canonicalUrl: string;
  thumbnailUrl: string | null; mediaUrls: string[]; sourcePublishedAt: string;
  scheduledStartAt: string | null; liveStatus: string | null;
  rawMetadata: Record<string, unknown>;
};
export type ProviderPollResult = { items: NormalizedSocialContent[]; cursor: string | null; retryAfterSeconds?: number };
export type ProviderContext = {
  accessToken: string; refreshToken?: string; cursor?: string | null;
  metadata?: Record<string, unknown>; signal?: AbortSignal;
};
export type AuthorizationContext = { state: string; codeChallenge?: string };
export type ExchangeContext = { code: string; codeVerifier?: string };
export type VerifiedWebhook = { eventId: string; eventType: string; payload: Record<string, unknown> };
export type ProviderAccessLevel="none"|"development"|"standard"|"advanced"|"approved";
export type ProviderReviewStatus="not_required"|"not_configured"|"required"|"submitted"|"approved"|"restricted"|"rejected";
export type ProviderReviewReadiness={configured:boolean;credentialsPresent:boolean;productConfigured:boolean;requiredScopes:string[];grantedScopes:string[];missingScopes:string[];accessLevel:ProviderAccessLevel;reviewStatus:ProviderReviewStatus;connectionAvailable:boolean;identityAvailable:boolean;assetDiscoveryAvailable:boolean;contentDetectionAvailable:boolean;webhookAvailable:boolean;pollingAvailable:boolean;manualImportAvailable:boolean;manualVerificationAvailable:boolean;limitations:string[]};
export type ProviderReadiness=ProviderReviewReadiness&{verificationAvailable:boolean;manualFallbackAvailable:boolean;missingConfiguration:string[]};
export type LegacyProviderReadiness={configured:boolean;connectionAvailable:boolean;verificationAvailable:boolean;contentDetectionAvailable:boolean;webhookAvailable:boolean;pollingAvailable:boolean;manualFallbackAvailable:boolean;missingConfiguration:string[];limitations:string[]};
export type DiscoveredProviderSource={sourceType:string;stableSourceId:string;displayName:string|null;canonicalUrl:string;metadata:Record<string,unknown>};

export interface SocialProviderAdapter {
  provider: SocialProvider;
  displayName: string;
  availability: ProviderAvailability;
  unavailableReason?: string;
  capabilities: ProviderCapabilities;
  emergencyVerification: EmergencyVerificationCapabilities;
  requestedScopes: string[];
  createAuthorizationUrl?(context: AuthorizationContext): Promise<{ url: string }>;
  exchangeAuthorizationCode?(context: ExchangeContext): Promise<ProviderTokenSet>;
  refreshAccessToken?(context: ProviderContext): Promise<ProviderTokenSet>;
  revokeConnection?(context: ProviderContext): Promise<void>;
  fetchIdentity?(context: ProviderContext): Promise<ProviderIdentity>;
  fetchEmergencyAccountIdentity?(context: EmergencyVerificationContext): Promise<ProviderIdentity>;
  verifyEmergencyAccountOwnership?(context: EmergencyVerificationContext): Promise<ProviderIdentity>;
  checkProfileChallenge?(context: EmergencyVerificationContext): Promise<ProviderIdentity | null>;
  pollContent?(context: ProviderContext): Promise<ProviderPollResult>;
  verifyWebhook?(request: Request): Promise<VerifiedWebhook>;
  normalizeWebhook?(event: VerifiedWebhook): Promise<NormalizedSocialContent[]>;
  normalizeContent?(item: unknown): NormalizedSocialContent | null;
  readiness?():ProviderReadiness|LegacyProviderReadiness;
  discoverSources?(context:ProviderContext):Promise<DiscoveredProviderSource[]>;
  discoverAssets?(context:ProviderContext):Promise<DiscoveredProviderSource[]>;
  selectAsset?(value:unknown):Promise<DiscoveredProviderSource>;
  fetchContent?(context:ProviderContext):Promise<ProviderPollResult>;
  fetchAuthoritativeState?(context:ProviderContext):Promise<Record<string,unknown>>;
  fetchAuthoritativeDestinationState?(context:ProviderContext):Promise<Record<string,unknown>>;
  verifyOwnership?(context:ProviderContext):Promise<{verified:boolean;method:string;confidence:"low"|"medium"|"high"}>;
  calculateNextSync?(result:ProviderPollResult|Error):Date;
  classifyError?(error:unknown):{code:string;retryable:boolean;retryAfterSeconds?:number};
  manualImport?(value:unknown):Promise<NormalizedSocialContent|null>;
  manualVerification?(value:unknown):Promise<{verified:false;reason:string}>;
}

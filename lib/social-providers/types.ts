export const socialProviders = [
  "youtube", "instagram", "tiktok", "x", "spotify", "twitch", "linkedin",
  "facebook", "snapchat", "threads", "pinterest", "discord",
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
  grantedScopes: string[]; tokenType: string;
};
export type ProviderIdentity = {
  id: string; name: string; url: string; metadata: Record<string, unknown>;
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

export interface SocialProviderAdapter {
  provider: SocialProvider;
  displayName: string;
  availability: ProviderAvailability;
  unavailableReason?: string;
  capabilities: ProviderCapabilities;
  requestedScopes: string[];
  createAuthorizationUrl?(context: AuthorizationContext): Promise<{ url: string }>;
  exchangeAuthorizationCode?(context: ExchangeContext): Promise<ProviderTokenSet>;
  refreshAccessToken?(context: ProviderContext): Promise<ProviderTokenSet>;
  revokeConnection?(context: ProviderContext): Promise<void>;
  fetchIdentity?(context: ProviderContext): Promise<ProviderIdentity>;
  pollContent?(context: ProviderContext): Promise<ProviderPollResult>;
  verifyWebhook?(request: Request): Promise<VerifiedWebhook>;
  normalizeWebhook?(event: VerifiedWebhook): Promise<NormalizedSocialContent[]>;
  normalizeContent?(item: unknown): NormalizedSocialContent | null;
}

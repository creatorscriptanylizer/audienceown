import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
export const YOUTUBE_READONLY_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";

export type YouTubeAccountRole = "official" | "backup";
export type YouTubeOAuthState = {
  creatorId: string;
  userId: string;
  nonce: string;
  expiresAt: number;
  role: YouTubeAccountRole;
  connectionId?: string;
  protectedOfficialAccountId?: string;
  returnTo?: "onboarding";
};
type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
};

export class YouTubeOAuthError extends Error {
  constructor(
    public code: "invalid_grant" | "access_revoked" | "oauth_rate_limited" | "oauth_temporary_failure" | "oauth_network_failure" | "oauth_token_response_malformed",
    public retryAfterSeconds?: number,
  ) {
    super(code);
  }
}

function oauthConfig() {
  const clientId = process.env.GOOGLE_YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_YOUTUBE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_YOUTUBE_REDIRECT_URI;
  const stateSecret = process.env.YOUTUBE_OAUTH_STATE_SECRET;
  if (!clientId || !clientSecret || !redirectUri || !stateSecret) {
    throw new Error("YouTube OAuth is not configured.");
  }
  return { clientId, clientSecret, redirectUri, stateSecret };
}

export function createYouTubeOAuthState(payload: YouTubeOAuthState) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", oauthConfig().stateSecret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyYouTubeOAuthState(value: string, expectedNonce: string, now = Date.now()): YouTubeOAuthState | null {
  try {
    const [body, signature] = value.split(".");
    if (!body || !signature) return null;
    const expected = createHmac("sha256", oauthConfig().stateSecret).update(body).digest();
    const supplied = Buffer.from(signature, "base64url");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
    const payload: unknown = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    const state = payload as Record<string, unknown>;
    if (typeof state.creatorId !== "string" || typeof state.userId !== "string" || typeof state.nonce !== "string"
      || typeof state.expiresAt !== "number" || (state.role !== "official" && state.role !== "backup")
      || (state.connectionId !== undefined && (typeof state.connectionId !== "string" || !state.connectionId))
      || (state.protectedOfficialAccountId !== undefined && (typeof state.protectedOfficialAccountId !== "string" || !state.protectedOfficialAccountId))
      || (state.returnTo !== undefined && state.returnTo !== "onboarding")) return null;
    return state.nonce === expectedNonce && state.expiresAt >= now ? state as YouTubeOAuthState : null;
  } catch {
    return null;
  }
}

export function getYouTubeAuthorizationUrl(state: string) {
  const { clientId, redirectUri } = oauthConfig();
  const params = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: "code",
    scope: YOUTUBE_READONLY_SCOPE, access_type: "offline", include_granted_scopes: "true",
    prompt: "consent", state,
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

async function tokenRequest(params: URLSearchParams, fetcher: typeof fetch): Promise<TokenResponse> {
  let response: Response;
  try {
    response = await fetcher(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: params,
      cache: "no-store",
    });
  } catch {
    throw new YouTubeOAuthError("oauth_network_failure");
  }
  const retryAfterHeader = response.headers.get("retry-after");
  const retryAfterSeconds = retryAfterHeader && /^\d+$/.test(retryAfterHeader) ? Number(retryAfterHeader) : undefined;
  let body: Partial<TokenResponse> & { error?: string } = {};
  try { body = await response.json() as typeof body; } catch { /* normalized below */ }
  if (!response.ok) {
    if (body.error === "invalid_grant") throw new YouTubeOAuthError("invalid_grant");
    if (body.error === "access_denied") throw new YouTubeOAuthError("access_revoked");
    if (response.status === 429) throw new YouTubeOAuthError("oauth_rate_limited", retryAfterSeconds);
    if (response.status >= 500) throw new YouTubeOAuthError("oauth_temporary_failure", retryAfterSeconds);
    throw new YouTubeOAuthError("access_revoked");
  }
  if (!body.access_token || !body.expires_in) throw new YouTubeOAuthError("oauth_token_response_malformed");
  return body as TokenResponse;
}

export function exchangeYouTubeCode(code: string, fetcher: typeof fetch = fetch) {
  const { clientId, clientSecret, redirectUri } = oauthConfig();
  return tokenRequest(new URLSearchParams({
    code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri,
    grant_type: "authorization_code",
  }), fetcher);
}

export function refreshYouTubeAccessToken(refreshToken: string, fetcher: typeof fetch = fetch) {
  const { clientId, clientSecret } = oauthConfig();
  return tokenRequest(new URLSearchParams({
    refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret,
    grant_type: "refresh_token",
  }), fetcher);
}

export async function revokeGoogleToken(token: string, fetcher: typeof fetch = fetch) {
  const response = await fetcher(GOOGLE_REVOKE_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
    cache: "no-store",
  });
  if (response.ok || response.status === 400) return { status: "revoked" as const };
  return { status: "pending" as const };
}

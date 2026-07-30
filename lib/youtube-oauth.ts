import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";

type OAuthState = { creatorId: string; userId: string; nonce: string; expiresAt: number };
type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
};

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

export function createYouTubeOAuthState(payload: OAuthState) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", oauthConfig().stateSecret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyYouTubeOAuthState(value: string, expectedNonce: string, now = Date.now()): OAuthState | null {
  try {
    const [body, signature] = value.split(".");
    if (!body || !signature) return null;
    const expected = createHmac("sha256", oauthConfig().stateSecret).update(body).digest();
    const supplied = Buffer.from(signature, "base64url");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as OAuthState;
    return payload.nonce === expectedNonce && payload.expiresAt >= now ? payload : null;
  } catch {
    return null;
  }
}

export function getYouTubeAuthorizationUrl(state: string) {
  const { clientId, redirectUri } = oauthConfig();
  const params = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: "code",
    scope: YOUTUBE_SCOPE, access_type: "offline", include_granted_scopes: "true",
    prompt: "consent", state,
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

async function tokenRequest(params: URLSearchParams, fetcher: typeof fetch): Promise<TokenResponse> {
  const response = await fetcher(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(response.status === 400 ? "oauth_authorization_invalid" : "oauth_token_exchange_failed");
  const body = await response.json() as Partial<TokenResponse>;
  if (!body.access_token || !body.expires_in) throw new Error("oauth_token_response_malformed");
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

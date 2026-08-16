# Twitch OAuth integration

Verified against Twitch's official developer documentation on 2026-08-11.

## OAuth and application setup

AudienceOwn uses Twitch's server-side Authorization Code Grant, not the implicit flow. Authorization starts at `https://id.twitch.tv/oauth2/authorize`; the callback exchanges the code at `https://id.twitch.tv/oauth2/token`. The registered redirect URL and the `redirect_uri` used in both authorization and token exchange must match. Registering an app requires a verified Twitch account with two-factor authentication, a unique application name, one or more OAuth redirect URLs, and an application category. The client secret is server-only; generating a new secret invalidates the previous one.

The configured callback is supplied through `TWITCH_REDIRECT_URI`. Twitch's production console must contain that exact callback URL. AudienceOwn uses the shared signed state and nonce cookie for CSRF protection and preserves creator, user, provider, role, expiration, and reconnect connection ID.

Sources: [Register Your App](https://dev.twitch.tv/docs/authentication/register-app), [Getting OAuth Access Tokens](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/).

## Identity, profile, and scopes

`GET https://api.twitch.tv/helix/users` with the authorized user token returns Twitch's stable numeric user ID plus login, display name, description, broadcaster type, profile image, and creation time. AudienceOwn stores the numeric ID as `external_account_id`, builds the canonical profile URL from the login, and never treats the mutable login as the identity key.

AudienceOwn requests no privileged Twitch scopes. `GET https://api.twitch.tv/helix/channels/followers?broadcaster_id=<id>&first=1` returns the aggregate `total` even when `moderator:read:followers` is absent; without that scope, follower identity rows are omitted. Since AudienceOwn needs only the total, requesting the moderation scope would be unnecessary. It does not fetch or persist follower identities and requests no chat, moderation, subscription, or channel/stream-management scopes.

Sources: [Get Users and Get Channel Followers](https://dev.twitch.tv/docs/api/reference/), [Twitch access-token scopes](https://dev.twitch.tv/docs/authentication/scopes/).

## Token lifecycle, validation, and disconnect

Authorization Code Grant responses include an access token, refresh token, token type, scopes, and `expires_in`. Twitch recommends reacting to API `401` responses instead of relying only on proactive expiry. Refresh uses `POST https://id.twitch.tv/oauth2/token` with `grant_type=refresh_token`; a successful response supplies a new access token and refresh token, so AudienceOwn validates the complete response and rotates both under the shared per-connection refresh lease. Centralizing refresh is important because Twitch limits a refresh token to 50 simultaneously valid access tokens; exceeding that limit invalidates the oldest token.

Third-party applications that maintain Twitch OAuth sessions must validate tokens at `GET https://id.twitch.tv/oauth2/validate` using `Authorization: OAuth <token>`. AudienceOwn validates during synchronization/credential-health use, not on page render. An invalid token triggers a lease-protected refresh; invalid refresh authorization becomes Action required, while rate limits and 5xx/network failures remain temporary failures.

Disconnect revokes the access token at `POST https://id.twitch.tv/oauth2/revoke` with `client_id` and `token`, then removes only the selected connection and its encrypted local credentials. Tokens may become invalid because they expire, the user disconnects the app, changes their password, or Twitch revokes them. Refresh tokens can also become invalid and then require fresh user authorization.

Sources: [Refreshing Access Tokens](https://dev.twitch.tv/docs/authentication/refresh-tokens/), [Validating Tokens](https://dev.twitch.tv/docs/authentication/validate-tokens/), [Revoking Access Tokens](https://dev.twitch.tv/docs/authentication/revoke-tokens/).

## Rate limits and synchronization

Helix uses token-bucket rate limiting. User-token requests are limited per client ID and user per minute. Responses expose `Ratelimit-Limit`, `Ratelimit-Remaining`, and `Ratelimit-Reset`; HTTP 429 indicates throttling. AudienceOwn schedules Twitch audience synchronization at a six-hour minimum cadence, backs off after failures, preserves the last successful total as stale during temporary failures, and does not disconnect on provider 5xx responses.

Source: [Twitch API rate limits](https://dev.twitch.tv/docs/api/guide#twitch-rate-limits).

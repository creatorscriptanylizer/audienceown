# Spotify OAuth

Verified against Spotify's official developer documentation on 2026-08-11.

## Product identity

AudienceOwn connects the authenticated Spotify **user profile**. The stable connection key is the current-profile response's immutable, pseudoanonymous `account_id`; the legacy `id`, display name, and profile URL are not account-linking keys. Non-secret metadata records `spotifyAssetType: "user"`.

A Spotify login does not establish ownership of an artist, show, label, playlist, release, or episode. The Web API provides public artist catalog data but no OAuth relationship that enumerates or proves which artists belong to the authenticated user. Saved shows describe listening/library state, not podcast ownership. Consequently this integration performs no artist/show asset discovery or selection. Existing manual artist/show links remain unverified unless AudienceOwn has separate authoritative evidence, such as a verified canonical podcast feed.

## OAuth and scopes

- Server-side web apps use Authorization Code flow at `https://accounts.spotify.com/authorize` and exchange at `https://accounts.spotify.com/api/token` with confidential client credentials.
- AudienceOwn also applies S256 PKCE as defense in depth, using its shared signed state, nonce, short-lived HttpOnly callback cookie, and one-time verifier.
- Requested scope: `user-read-private`, the documented current-profile scope. Email, library, playback, listening-history, top-item, and write scopes are not requested.
- The redirect URI must exactly match the dashboard allowlist. HTTPS is required except for explicit IPv4/IPv6 loopback literals. `localhost` is rejected; local development uses `http://127.0.0.1:3000/api/integrations/spotify/callback`.

## Tokens and disconnect

Access tokens normally last one hour. Refresh tokens issued to dashboard apps currently last six months; refreshing does not extend that lifetime. A refresh response may omit `refresh_token`, in which case AudienceOwn preserves the encrypted existing token, and replaces it only when Spotify returns a new valid token. `invalid_grant` requires reauthorization. Access and refresh tokens are encrypted with `SOCIAL_TOKEN_ENCRYPTION_KEY`; no token is stored in provider metadata or sent to the browser.

Spotify documents no Web API token-revocation endpoint. Disconnect therefore deletes only the requested AudienceOwn connection and its credentials locally. Users may separately remove the app from Spotify account settings.

## Audience and creator assets

The current-user response still documents a deprecated `followers` object, but it is not a durable creator metric and the authenticated user is not a proven artist/show destination. AudienceOwn therefore sets `audienceMetricSupported=false`, displays the metric as unavailable, and schedules no Spotify audience polling. Public artist `followers.total` exists for a known artist ID, but is not used because OAuth does not prove that artist belongs to the logged-in user. Shows expose catalog and episode metadata, not a show follower count or ownership relationship.

## Quotas, review, and failures

Spotify calculates rate limits over a rolling 30-second window and returns HTTP 429; callers must honor `Retry-After`. Development quota exhaustion can also return 429 with `reason: "QUOTA_EXCEEDED"`. Temporary 429/5xx failures are degraded or retryable, while invalid or expired credentials require action rather than being treated as a provider outage.

New apps start in Development Mode. The app owner must have Spotify Premium, only five allowlisted authenticated users may use the app, and development quota is shared across the developer account. Extended Quota permits an unlimited user base and higher limits. Since 2025, extension applications are accepted only from established organizations through a company email and require an active launched service and the remaining Spotify criteria. These restrictions are informational in the picker and do not prevent allowlisted development OAuth.

Current official references:

- https://developer.spotify.com/documentation/web-api/concepts/authorization
- https://developer.spotify.com/documentation/web-api/tutorials/code-flow
- https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
- https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens
- https://developer.spotify.com/documentation/web-api/concepts/redirect_uri
- https://developer.spotify.com/documentation/web-api/reference/get-current-users-profile
- https://developer.spotify.com/documentation/web-api/reference/get-an-artist
- https://developer.spotify.com/documentation/web-api/reference/get-a-show
- https://developer.spotify.com/documentation/web-api/concepts/rate-limits
- https://developer.spotify.com/documentation/web-api/concepts/quota-modes
- https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide

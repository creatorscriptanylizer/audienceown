# X OAuth

AudienceOwn connects X accounts through the shared provider registry, signed state, PKCE transaction cookie, normalized identity/audience model, encrypted secret storage, credential refresh worker, exact reconnect validation, and exact-account removal pipeline.

## Current official capability matrix

| Capability | X implementation |
| --- | --- |
| User authorization | OAuth 2.0 Authorization Code Flow with PKCE |
| Authorization endpoint | `https://x.com/i/oauth2/authorize` |
| Token and refresh endpoint | `POST https://api.x.com/2/oauth2/token` |
| Revocation endpoint | `POST https://api.x.com/2/oauth2/revoke` |
| Client type | Confidential Web App; token endpoints use HTTP Basic with client ID and secret |
| PKCE | Required; a new random verifier and S256 challenge are generated for every transaction |
| Identity | `GET https://api.x.com/2/users/me` |
| Stable identity | Numeric `data.id`; username and display name are mutable presentation fields |
| Profile fields | `name`, `username`, `profile_image_url`, `description`, `protected` |
| Follower metric | `public_metrics.followers_count` through `user.fields=public_metrics` |
| OAuth scopes | `tweet.read users.read offline.access` |
| Refresh | `offline.access` causes X to issue a refresh token; successful refresh responses may rotate it |
| Access-token lifetime | The returned `expires_in` is authoritative and is persisted as `token_expires_at` |
| Identity rate limit | `/2/users/me`: 75 requests per user per 15 minutes |
| Rate-limit recovery | Honor `x-rate-limit-reset`, then use the shared bounded backoff and stale-metric preservation |
| API access | Current X API access is pay-per-use and requires credits in the Developer Console |

`tweet.read` is required alongside `users.read` by X for the authenticated `/2/users/me` identity flow. AudienceOwn remains read-only: it requests no `tweet.write` or DM scopes. Automatic post detection remains gated by the configured and entitled X API product tier.

## Developer Console configuration

1. Create an X developer app and select a confidential Web App client.
2. Enable OAuth 2.0 Authorization Code Flow with PKCE.
3. Configure Read app permissions and request exactly `tweet.read`, `users.read`, and `offline.access`.
4. Add exact callback URLs. X permits up to ten; every character, including a trailing slash, must match.
5. Use HTTPS for production. For local development, X documents `http://127.0.0.1`, not `localhost`.
6. Add pay-per-use credits and set a spending limit before enabling user lookup and follower synchronization.

## Environment variables

```dotenv
X_CLIENT_ID=
X_CLIENT_SECRET=
X_REDIRECT_URI=http://127.0.0.1:3000/api/integrations/x/callback
X_API_ACCESS_TIER=unavailable
SOCIAL_OAUTH_STATE_SECRET=
SOCIAL_TOKEN_ENCRYPTION_KEY=
```

All variables are server-only. Do not expose the client secret, PKCE verifier, OAuth tokens, state secret, or encryption key through `NEXT_PUBLIC_*` values.

Production redirect URI:

```text
https://<production-host>/api/integrations/x/callback
```

## OAuth lifecycle

The picker sends official accounts to `/api/integrations/x/connect?role=official` and backups to the same route with `role=backup`. Reconnect adds the exact `connectionId`. The shared state binds provider, creator, authenticated user, role, nonce, optional connection ID, PKCE challenge, and expiration. The verifier is stored only in an HttpOnly, SameSite cookie scoped to the X callback.

The callback validates state and nonce, exchanges the code using HTTP Basic and the PKCE verifier, calls `/2/users/me`, uses numeric `data.id` as `external_account_id`, rejects creator-level duplicates, validates exact reconnect identity, persists `is_primary=false`, encrypts access and refresh tokens, and initializes the exact connection's follower metric when the API entitlement permits it.

The shared credential worker refreshes before access-token expiry. A returned rotated refresh token is encrypted and stored only after the entire successful response has been validated. Invalid grants require reconnection; rate limits and temporary X failures preserve the connection and last known follower metric.

Disconnect attempts to revoke the refresh token (or access token if no refresh token exists), then removes only the requested creator-owned connection and its cascading authorized data.

## Known limitations

- OAuth code paths and mocked API contracts are implemented, but real X authorization has not been exercised without developer credentials.
- User identity and follower reads consume pay-per-use API credits. A configured OAuth client alone does not guarantee successful API reads.
- X may change endpoint pricing in the Developer Console; no price is hard-coded in AudienceOwn.
- A protected account can still establish OAuth identity, but automatic public-post detection is not enabled by this flow.
- The official documentation does not promise a fixed access-token lifetime on the cited flow page; AudienceOwn relies on each validated `expires_in` response.

Official references: [OAuth 2.0 with PKCE](https://docs.x.com/fundamentals/authentication/oauth-2-0/user-access-token), [developer app callback requirements](https://docs.x.com/fundamentals/developer-apps), [authenticated user lookup](https://docs.x.com/x-api/users/get-my-user), [user fields and public metrics](https://docs.x.com/x-api/fundamentals/fields), [rate limits](https://docs.x.com/x-api/fundamentals/rate-limits), and [pay-per-use pricing](https://docs.x.com/x-api/getting-started/pricing).

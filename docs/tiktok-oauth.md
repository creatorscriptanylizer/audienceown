# TikTok OAuth

AudienceOwn connects TikTok through the shared provider registry, signed OAuth state, normalized identity/audience model, encrypted secret store, refresh worker, and exact connection removal pipeline.

## Capability matrix

| Capability | TikTok Web integration |
| --- | --- |
| Authorization | `https://www.tiktok.com/v2/auth/authorize/` |
| Token exchange and refresh | `POST https://open.tiktokapis.com/v2/oauth/token/` |
| Revocation | `POST https://open.tiktokapis.com/v2/oauth/revoke/` |
| Identity | `GET https://open.tiktokapis.com/v2/user/info/` |
| Stable identity | App-scoped `open_id`; usernames and display names are not identifiers |
| Requested scopes | `user.info.basic,user.info.profile,user.info.stats` |
| Profile fields | `display_name`, `username`, `avatar_url`, `profile_deep_link`, `bio_description` |
| Audience | `follower_count` with approved and granted `user.info.stats`; zero is valid |
| PKCE | Not required for the confidential Web Login Kit flow; signed state and nonce remain required. TikTok requires PKCE for Desktop and native public-client flows. |
| Access token | Normally 24 hours (`expires_in` is authoritative) |
| Refresh token | Normally 365 days (`refresh_expires_in` is authoritative); refresh may rotate it |
| User Info rate limit | Default 600 requests per minute per endpoint, enforced over a one-minute sliding window |
| Production access | TikTok app review and Live status required |
| Sandbox | Restricted to configured target users; up to 10 target accounts and up to 5 sandboxes |

`video.list` is intentionally not requested by this account-connection flow. It is not needed for identity or follower metrics, and automatic video detection remains disabled unless a separately reviewed product flow is introduced.

## Developer application setup

1. Create an application in TikTok for Developers and add the Web platform.
2. Add Login Kit and the Display API capabilities used by the profile screen.
3. Request `user.info.basic`, `user.info.profile`, and `user.info.stats`. The latter scopes require review and user consent.
4. Configure an exact static HTTPS redirect URI. TikTok Web redirect URIs cannot contain query parameters or fragments and must be fewer than 512 characters. A maximum of 10 may be registered.
5. Verify the required website, privacy-policy, and terms URLs, then submit the production app and requested scopes for review with the required demonstration video.

## Environment variables

All values are server-only:

```dotenv
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_REDIRECT_URI=https://localhost:3000/api/integrations/tiktok/callback
TIKTOK_APP_REVIEW_STATUS=not_configured
SOCIAL_OAUTH_STATE_SECRET=
SOCIAL_TOKEN_ENCRYPTION_KEY=
```

Do not use `NEXT_PUBLIC_` for the client secret or token-encryption key. Set `TIKTOK_APP_REVIEW_STATUS=approved` only after the corresponding production revision and requested scopes are actually Live.

## Redirect URIs

- Local HTTPS development: `https://localhost:3000/api/integrations/tiktok/callback`
- Production: `https://<production-host>/api/integrations/tiktok/callback`
- AudienceOwn development tunnel: `https://dev.audienceown.com/api/integrations/tiktok/callback`

TikTok Web Login Kit does not accept a plain HTTP localhost callback. Local testing therefore needs a trusted local HTTPS server or an HTTPS development tunnel whose exact callback has been registered.

## Connection lifecycle

The connect route is `/api/integrations/tiktok/connect?role=official|backup`. Reconnect adds `connectionId=<uuid>`. The signed state binds provider, creator, user, nonce, role, optional connection ID, and expiry. The callback exchanges the code, verifies the returned `open_id`, prevents duplicate stable identities, persists an exact official or backup connection with `is_primary=false`, encrypts both tokens, and initializes the exact connection's follower metric.

Access tokens are refreshed before expiry by the shared credential worker. A rotated refresh token replaces the encrypted stored refresh token only after TikTok returns and validates a complete successful response. The last known metric remains available through temporary errors and rate limits. Invalid or revoked grants require reconnection.

Disconnect uses `/api/integrations/tiktok/disconnect`, attempts TikTok revocation, and then removes only the requested creator-owned connection and its cascading encrypted/provider data.

## Known limitations

- Production behavior cannot be validated without a configured, reviewed TikTok developer application and consenting real account.
- `user.info.stats` may be absent or denied until scope review is approved. Connection can still succeed, with audience shown as unavailable/pending.
- Web Login Kit requires HTTPS even for localhost.
- TikTok does not provide a Display API new-video webhook; content polling is outside this connection-only scope.

Official references: [Login Kit for Web](https://developers.tiktok.com/doc/login-kit-web), [user token management](https://developers.tiktok.com/doc/oauth-user-access-token-management), [User Info API](https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info/), [rate limits](https://developers.tiktok.com/doc/tiktok-api-v2-rate-limit/), [sandbox](https://developers.tiktok.com/doc/add-a-sandbox/), and [app registration/review](https://developers.tiktok.com/doc/getting-started-create-an-app).

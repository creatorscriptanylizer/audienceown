# Pinterest OAuth integration

Verified against Pinterest's official developer documentation and OpenAPI description on 2026-08-11.

## App setup and OAuth flow

AudienceOwn uses Pinterest's server-side Authorization Code grant. Authorization begins at `https://www.pinterest.com/oauth/`; the callback exchanges the code at `https://api.pinterest.com/v5/oauth/token`. Pinterest requires the token request to authenticate the app with HTTP Basic authentication using the app ID and server-only app secret. The redirect URI must exactly match a URI registered in the app and must not produce a secondary redirect. AudienceOwn uses its shared signed OAuth state and nonce cookie; Pinterest's current documentation does not require or describe PKCE for this confidential web flow.

AudienceOwn's App ID is `1600991`. The app uses `PINTEREST_APP_ID`, server-only `PINTEREST_APP_SECRET`, and `PINTEREST_REDIRECT_URI`. The exact production callback is `https://audienceown.com/api/integrations/pinterest/callback`. Trial access is pending and Pinterest has not exposed the app secret, so the provider remains implemented but configuration-missing and not connectable. Supply the secret only through environment configuration after approval.

Source: [Pinterest authentication and authorization](https://developers.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/), [Connect an app](https://developers.pinterest.com/docs/getting-started/connect-app/).

## Identity, scope, and follower count

AudienceOwn requests exactly `user_accounts:read`, `boards:read`, and `pins:read`. These support account identity/follower reads and the existing read-only board/Pin runtime. It does not request write, advertising, billing, business-access, or catalog scopes. `GET https://api.pinterest.com/v5/user_account` returns the token's authenticated user account. Its numeric `id` is the stable external identity; mutable username, business name, profile URL, and avatar are presentation fields only. Boards are content resources and never canonical creator identity.

Pinterest's official OpenAPI `Account` schema includes nullable `follower_count`. AudienceOwn uses that exact account total with unit `followers`; zero is a valid value. If Pinterest omits the nullable count or denies the required scope, the OAuth connection remains valid and the metric is shown as unavailable or permission-required. AudienceOwn does not scrape Pinterest or count paginated follower identities.

Sources: [Official Pinterest OpenAPI](https://github.com/pinterest/api-description), [Manage user accounts](https://developers.pinterest.com/docs/work-with-organic-content-and-users/manage-user-accounts/), [Pinterest entities](https://developers.pinterest.com/docs/key-concepts/pinterest-entities/).

## Tokens and disconnect

Access tokens expire after 30 days. Pinterest now supports continuous refresh tokens: they expire after 60 days but can be refreshed indefinitely when refreshed before expiry. Apps created before September 25, 2025 must request `continuous_refresh=true`; newer apps use continuous refresh automatically. Both code exchange and refresh responses return a refresh token, so AudienceOwn validates the complete response and rotates the encrypted access and refresh credentials under the shared per-connection refresh lease. Refresh-token expiry metadata is stored safely with the connection lifecycle.

Pinterest documents `POST /oauth/token/revoke`, but its current OpenAPI states that only system-user tokens are supported. AudienceOwn uses end-user Authorization Code tokens, so it does not call that endpoint or advertise provider revocation. Disconnect removes only the exact local connection and encrypted credentials. Invalid or expired authorization requires reconnect.

Source: [Pinterest authentication and token management](https://developers.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/), [Official Pinterest OpenAPI](https://github.com/pinterest/api-description).

## Access tiers, sandbox, and rate limits

Pinterest API access requires app review. Trial access is intended for exploration; Standard access is recommended for production and requires a compliant use case plus an OAuth demonstration video. Trial has a universal limit of 1,000 requests per day per app. Standard has a universal limit of 100 requests per second per user per app, plus endpoint-category limits. User-account reads are in the `org_read` category. Responses expose `x-ratelimit-limit`, `x-ratelimit-remaining`, and `x-ratelimit-reset`; HTTP 429 is temporary and should be retried after backoff.

Sandbox tokens and entities are separate from production. Sandbox supports the user-account endpoint, but sandbox tokens cannot be used against production. AudienceOwn's background follower synchronization uses the shared 12-hour Pinterest cadence, lease-protected refresh, exponential backoff, and preservation of the last successful metric on temporary errors.

Sources: [Access tiers](https://developers.pinterest.com/docs/key-concepts/access-tiers/), [Rate limits](https://developers.pinterest.com/docs/reference/rate-limits/), [Sandbox](https://developers.pinterest.com/docs/developer-tools/sandbox/).

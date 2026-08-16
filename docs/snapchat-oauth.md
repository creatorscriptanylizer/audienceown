# Snapchat OAuth production notes

Verified against Snap's official developer documentation on 2026-08-11.

## Login Kit application setup

AudienceOwn uses the confidential OAuth 2.0 Authorization Code flow for Login Kit. Configure a Snap Kit application in the Snap Developer Portal, enable Login Kit and Display Name, leave Bitmoji Avatar disabled, register the exact callback, add AudienceOwn's privacy policy, and set:

- `SNAPCHAT_CLIENT_ID`
- `SNAPCHAT_CLIENT_SECRET` (server only)
- `SNAPCHAT_REDIRECT_URI`
- the shared server-only `SOCIAL_TOKEN_ENCRYPTION_KEY`

Authorization uses `https://accounts.snapchat.com/accounts/oauth2/auth`; code exchange and refresh use `https://accounts.snapchat.com/accounts/oauth2/token`. The exact production callback is `https://audienceown.com/api/integrations/snapchat/callback`, and the redirect URI in both requests must match it. Access tokens and refresh-token rotation follow the values returned by Snapchat; AudienceOwn validates successful responses before storing encrypted credentials.

PKCE is disabled for Snapchat. The token endpoint receives the authorization code, exact redirect URI, client ID, client secret, and `authorization_code` grant type; it does not receive a code verifier. The client secret remains server-only. Signed AudienceOwn state binds the provider, creator, signed-in user, official/backup role, nonce, ten-minute expiry, optional protected official account, and optional reconnect connection ID. The nonce is validated against a single-use HttpOnly, SameSite callback cookie. Codes, tokens, state, nonces, cookies, client secrets, and encryption keys are never logged.

## Scopes and identity

The requested Login Kit scopes are:

- `https://auth.snapchat.com/oauth2/api/user.external_id` — required app-scoped stable identity;
- `https://auth.snapchat.com/oauth2/api/user.display_name` — display label;

AudienceOwn reads only `externalId` and optional `displayName` from `GET https://kit.snapchat.com/v1/me` using the documented GraphQL-style query. The app-scoped `externalId`, not display name, username-like text, avatar, or profile URL, becomes `external_account_id`. A missing or malformed optional presentation field does not replace or invalidate the stable identity. AudienceOwn neither requests nor parses Bitmoji data.

Login Kit does not expose contacts, friends, messages, Memories, stories, social graph data, username, a canonical public profile URL, Public Profile ownership, or follower/subscriber counts.

## Public Profiles and audience metrics

Snap's Public Profile API is a separate Marketing API product. It is currently allowlist-only, uses a separate OAuth application/scope (`snapchat-profile-api`), and provides authorized `my_profile`, profile metadata, and subscriber statistics only within that approved model. A Login Kit token must not be sent to those endpoints and authenticating a Login Kit user does not prove control of a Public Profile.

AudienceOwn therefore does not discover or select Public Profiles in this stage, does not poll Snapchat content, and reports audience metrics as unavailable. The existing Public Profile integration boundary returns unsupported until AudienceOwn receives allowlist access and implements its separate authorization lifecycle. No subscriber value is scraped or inferred.

Snap does not return a follower-facing profile destination through Login Kit. The OAuth connection remains private with `public_url_required`; creators may separately add a validated public Snapchat URL through AudienceOwn's manual/public-destination workflow. AudienceOwn never constructs a URL from the app-scoped external ID, display name, or Bitmoji.

## Refresh, reconnect, and disconnect

Reconnect validates creator ownership, provider, official/backup role, exact connection ID, and the same app-scoped `externalId`. A different identity returns `reconnect_mismatch` rather than mutating the connection.

Disconnect calls `POST https://accounts.snapchat.com/accounts/oauth2/revoke` with HTTP Basic client authentication and the refresh token when available, then removes only the exact local connection and encrypted credentials. Failed remote revocation does not prevent exact local removal. Failed initial secret persistence removes only the newly inserted Snapchat row.

Snap documents OAuth errors such as `invalid_grant` and access denial but does not publish a fixed Login Kit request quota suitable for hard-coding. AudienceOwn treats HTTP 429 as retryable, honors a provider retry interval when supplied, and classifies authentication failures as reconnect-required.

## Staging and review status

Staging testing requires an active Staging version, a Demo User, appropriate project membership, and a Staging Confidential OAuth client. A successful Staging authorization is a healthy Connected account, independent of whether it was acquired manually or by OAuth, but it does not establish public Production approval. The readiness model therefore remains implemented, configured, and connectable while review is required. Every public Snap Kit integration must be submitted for Snap review before production enablement; material changes can require re-review.

Official references:

- [Login Kit overview and OAuth endpoints](https://developers.snap.com/snap-kit/login-kit/overview)
- [Login Kit web integration, identity, refresh, and revocation](https://developers.snap.com/snap-kit/login-kit/Tutorials/web)
- [Snap Kit submission and review](https://developers.snap.com/snap-kit/app-review/submission-and-review)
- [Public Profile API access and separate OAuth model](https://developers.snap.com/marketing-api/Public-Profile-API/GetStarted)
- [Public Profile API profiles](https://developers.snap.com/marketing-api/Public-Profile-API/Profiles)
- [Public Profile metrics](https://developers.snap.com/marketing-api/Public-Profile-API/Metrics)

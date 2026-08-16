# LinkedIn OAuth integration

Verified against LinkedIn's official Microsoft Learn documentation on 2026-08-11.

## OAuth flow and application setup

AudienceOwn uses LinkedIn's three-legged Authorization Code flow. Authorization begins at `https://www.linkedin.com/oauth/v2/authorization`, and the server exchanges the returned code at `https://www.linkedin.com/oauth/v2/accessToken` using the client ID, server-only client secret, code, and identical redirect URI. Redirect URLs must be absolute HTTPS URLs registered as trusted URLs in the Developer Portal, cannot include fragments, and must match the configured callback. The authorization code expires after 30 minutes. AudienceOwn uses its shared signed state and nonce cookie rather than provider-specific state.

The app needs the Sign In with LinkedIn using OpenID Connect product for member sign-in. AudienceOwn requests only `openid profile`; it does not request email, publishing, marketing, advertising, messaging, or organization permissions.

Source: [Three-legged OAuth](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow).

## Member identity and OIDC validation

The minimum scopes are `openid profile`; email is not needed. `GET https://api.linkedin.com/v2/userinfo` returns the pairwise OpenID `sub`, which AudienceOwn persists as the stable member `external_account_id`. The request is authenticated with the access token obtained confidentially for AudienceOwn's client. AudienceOwn deliberately does not decode or trust the returned ID token, so ID-token issuer, audience, expiry, and JWKS validation are not bypassed—they are outside the consumed identity path. The signed OAuth state nonce protects the authorization callback.

Display name, given name, family name, picture, locale, and profile URL are optional presentation fields. Missing or malformed optional fields do not invalidate a stable `sub`; URLs are retained only when they are valid HTTP(S), and profile URLs must be on LinkedIn. LinkedIn warns that OIDC login does not verify real-world identity. The response does not guarantee a public vanity URL, and `sub` must never be converted into an `/in/` URL.

Personal profile follower or connection totals are not available through the OIDC product. A member connection therefore displays no audience count rather than a fabricated zero.

Source: [Sign In with LinkedIn using OpenID Connect](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2).

## Audience metrics

The self-service member OIDC product does not provide a documented personal follower or connection count. LinkedIn therefore declares `audienceMetricSupported = false`, and the dashboard displays “Audience metric unavailable.” OAuth success never depends on an audience request. AudienceOwn does not request restricted organization or Marketing permissions to manufacture a metric.

## Token lifecycle, disconnect, and rate limits

Standard LinkedIn access tokens currently have a documented 60-day lifetime. Most applications do not receive programmatic refresh tokens; those are limited to approved Marketing Developer Platform partners. AudienceOwn therefore does not advertise refresh support for its baseline OIDC connection and requires OAuth reconnect when authorization expires. It still safely accepts and encrypts provider-returned lifecycle fields, but does not invent refresh capability without partner enablement.

LinkedIn does not document a general provider revocation endpoint for this three-legged flow. Disconnect removes only the selected AudienceOwn connection and its encrypted local credentials. A member can separately remove application access in LinkedIn settings.

The encrypted credential is stored through the shared authorized-credential architecture. The baseline product does not poll content or audience data. A LinkedIn 401 during authenticated identity retrieval is treated as revoked authorization.

Sources: [Programmatic refresh tokens](https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens), [LinkedIn rate limits](https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits).

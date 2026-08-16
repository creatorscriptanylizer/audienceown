# Provider developer-console setup

Operator runbook verified against official provider documentation on 2026-08-11. Provider consoles change frequently: re-open the linked official page while configuring an app and record the result in the readiness matrix. Never paste credentials into tickets, chat, screenshots, or client-visible variables.

## Common preparation

1. Use the AudienceOwn legal entity, support contact, production domain, privacy policy, terms, and data-deletion URLs consistently.
2. Register every redirect exactly; do not use wildcards or rely on a second redirect.
3. Store IDs and secrets only in server environment configuration. Configure `SOCIAL_TOKEN_ENCRYPTION_KEY` and `SOCIAL_OAUTH_STATE_SECRET` before OAuth testing.
4. Add a development callback and the canonical HTTPS production callback separately where the provider permits both.
5. Run `npm run provider:config-check`. A configured result means syntactically present, not approved by the provider.
6. Test with provider-authorized development users before requesting public access. Record app ID, console owner, product, callback, test user, review status, and approval date in the operator password manager without recording secrets in this repository.

Production examples below use `https://<production-host>`. Replace that placeholder with the one canonical AudienceOwn origin.

## Meta: Instagram and Facebook Pages

Developer portal: [Meta App Dashboard](https://developers.facebook.com/apps/). Official references: [Instagram API with Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/) and [Facebook Pages API](https://developers.facebook.com/docs/pages-api/getting-started/).

Treat the two configuration surfaces separately. AudienceOwn supports direct Instagram Login with Instagram credentials; Facebook Login provides managed Facebook Pages and may expose linked professional Instagram assets.

Meta documentation returned HTTP 429 to automated retrieval during this audit. The operator must reconfirm current app-type/use-case choices, test-user controls, and Advanced Access requirements in the live dashboard before saving credentials.

### Instagram

- Product: use **Instagram API with Instagram Login**. AudienceOwn's direct Instagram button does not use Facebook Login and does not require the professional account to be linked to a Facebook Page. Do not substitute the Facebook Login product without changing the adapter deliberately.
- Eligible accounts: Instagram Professional Business and Creator accounts only; consumer/personal accounts are unsupported.
- Authorization endpoint: `https://www.instagram.com/oauth/authorize`.
- Code exchange endpoint: `POST https://api.instagram.com/oauth/access_token`.
- API host: `https://graph.instagram.com/{version}` for identity, media, and `followers_count`.
- Token lifecycle: exchange the short-lived token for a long-lived token with `ig_exchange_token`; refresh a valid, unexpired long-lived token with `ig_refresh_token`. AudienceOwn stores and rotates these values only in the encrypted connection-secret table.
- Disconnect: AudienceOwn removes the exact connection and attempts `DELETE https://graph.instagram.com/me/permissions`; creators can also revoke the app in Instagram/Meta settings.
- Permission: `instagram_business_basic`. The legacy `business_basic` scope is deprecated and must not be used.
- Credentials: server-only `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET`, and `INSTAGRAM_REDIRECT_URI`, plus shared `SOCIAL_OAUTH_STATE_SECRET` and `SOCIAL_TOKEN_ENCRYPTION_KEY`.
- Callback: exactly `/api/integrations/instagram/callback`. Local default is `http://localhost:3000/api/integrations/instagram/callback`; if the Meta console rejects HTTP localhost, use a stable HTTPS tunnel and set both the console and `INSTAGRAM_REDIRECT_URI` to the exact tunnel callback. Production is `https://<production-host>/api/integrations/instagram/callback`. Do not change Supabase URLs.
- Test account: add the professional Instagram account under the app's Instagram tester/role controls and accept the invitation before development-mode authorization.
- Access level and review: Standard Access is limited to professional accounts owned/managed by app-role users configured in the dashboard. Serving other creators requires Live mode, business verification where requested, and Advanced Access/App Review for `instagram_business_basic`. Provide reviewer credentials/instructions, a consent-flow recording, privacy policy, and data-deletion instructions.
- Production gate: exact HTTPS callback registered, privacy/data-deletion URLs reachable, app in the appropriate mode, permission approved, test authorization completed, identity and follower count verified, refresh/revoke tested, and AudienceOwn `INSTAGRAM_APP_REVIEW_STATUS=approved` only after approval is real.

### Facebook Pages

- App/product: configure Facebook Login and Pages API in the Meta app used for managed Page discovery.
- Credentials: `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`.
- Callbacks: local `http://localhost:3000/api/integrations/meta/callback`; production `https://<production-host>/api/integrations/meta/callback`.
- AudienceOwn scopes: `pages_show_list`, `pages_read_engagement`, `pages_read_user_content`, and `instagram_basic` for linked Instagram discovery.
- Test account: add a real operator as app Administrator/Developer/Tester. The account must manage at least one test Page; use two managed Pages to verify explicit selection. Do not use the authorizing user ID as the public Page identity.
- Review: non-role users require appropriate Advanced Access/App Review for requested Page permissions. Document Page-management authority and provide reproducible Page-selection steps.
- Ready to test: Facebook Login enabled; both callbacks exact; app-role user accepted; managed Page exists; requested permissions visible in the app; review state recorded.

## TikTok

Developer portal: [TikTok for Developers](https://developers.tiktok.com/apps/). Official references: [create an app](https://developers.tiktok.com/doc/getting-started-create-an-app), [Login Kit](https://developers.tiktok.com/doc/login-kit-overview), and [Login Kit for Web](https://developers.tiktok.com/doc/login-kit-web).

- App/product: create a Web application and add Login Kit. Obtain Client Key and Client Secret.
- Credentials: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI`.
- Callbacks: local `https://localhost:3000/api/integrations/tiktok/callback`; production `https://<production-host>/api/integrations/tiktok/callback`.
- Redirect rules: Web redirect URIs must be absolute HTTPS, exact, under 512 characters, and registered in Login Kit; up to ten are supported. Use a trusted local certificate or HTTPS tunnel if the provider/browser rejects local TLS.
- AudienceOwn scopes: `user.info.basic`, `user.info.profile`, `user.info.stats`. Additional scopes beyond basic identity require provider approval.
- Test setup: enable Sandbox where available, add target/test users through the app controls, and verify authorization plus token refresh without publishing.
- Review: submit the app registration/product and scopes for review before live status. Supply website, policies, use-case explanation, and demonstration materials requested by TikTok.
- Ready to test: Login Kit enabled; HTTPS callback exact; scopes approved for Sandbox; test user admitted; app status recorded.

## X

Developer portal: [X Developer Console](https://developer.x.com/en/portal/dashboard). Official references: [OAuth 2.0 Authorization Code with PKCE](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code) and [pay-per-use pricing](https://docs.x.com/x-api/getting-started/pricing).

- App/product: create a Project/App, enable OAuth 2.0, and configure a confidential Web App with Authorization Code + PKCE.
- Credentials: `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_REDIRECT_URI`, `X_API_ACCESS_TIER`.
- Callbacks: local `http://127.0.0.1:3000/api/integrations/x/callback`; production `https://<production-host>/api/integrations/x/callback`. Register exact values shown by the console; do not substitute `localhost` for `127.0.0.1`.
- AudienceOwn scopes: exactly `tweet.read`, `users.read`, and `offline.access`. Keep app permissions set to Read; no write or DM scopes are used.
- Test setup: authorize a controlled X account and confirm refresh-token issuance from `offline.access`.
- Commercial access: purchase only the minimum test credits, set a conservative spending limit, disable or tightly limit auto-recharge, and monitor the console balance. API requests stop when credits are exhausted.
- Ready to test: OAuth enabled; callback exact; client type confidential; credits and spending cap configured; test account available; access tier recorded.

## Twitch

Developer portal: [Twitch Developer Console](https://dev.twitch.tv/console/apps). Official references: [register an app](https://dev.twitch.tv/docs/authentication/register-app), [OAuth authentication](https://dev.twitch.tv/docs/authentication/), and [Get Channel Followers](https://dev.twitch.tv/docs/api/reference#get-channel-followers).

- App/product: register an application under an email-verified Twitch account with 2FA enabled. Generate the Client ID and one Client Secret.
- Credentials: `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_REDIRECT_URI`.
- Callbacks: local `http://localhost:3000/api/integrations/twitch/callback`; production `https://<production-host>/api/integrations/twitch/callback`.
- AudienceOwn scopes: none for identity and total follower count. `moderator:read:followers` is required only for follower identities/details; the broadcaster or moderator relationship must match.
- Test setup: authorize a controlled broadcaster channel. Regenerating the app secret invalidates the previous secret.
- Review: no general app review gate is documented for this read-only authorization, but Twitch policies, token validation, and rate limits apply.
- Ready to test: 2FA enabled; exact redirect saved; broadcaster available; credentials installed.

## Pinterest

Developer portal: [Pinterest My Apps](https://developers.pinterest.com/apps/). Official references: [connect an app](https://developers.pinterest.com/docs/getting-started/connect-app/), [authentication](https://developers.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/), and [access tiers](https://developers.pinterest.com/docs/key-concepts/access-tiers/).

- App/product: use a verified Pinterest business account, accept Developer Terms, and submit the Connect App request. AudienceOwn's App ID is `1600991`; Trial access is pending, so the app secret is not yet available.
- Credentials: `PINTEREST_APP_ID=1600991`, server-only `PINTEREST_APP_SECRET`, and `PINTEREST_REDIRECT_URI=https://audienceown.com/api/integrations/pinterest/callback`. Supply the secret through environment configuration only after Pinterest grants access; never add it to source control or a `NEXT_PUBLIC_*` variable.
- Callbacks: local `http://localhost:3000/api/integrations/pinterest/callback`; production `https://audienceown.com/api/integrations/pinterest/callback`. The request value must exactly match a configured URI and must not issue a secondary redirect.
- AudienceOwn scopes: exactly `user_accounts:read`, `boards:read`, and `pins:read`. No write, advertising, billing, business-access, or catalog scopes are requested.
- Test setup: Trial access supports development testing and 24-hour product-limited tokens; OAuth uses authorization code and refresh tokens. Sandbox endpoints cover only supported Sandbox operations.
- Review: Standard access is recommended for a production multi-user integration. The upgrade requires prior Trial approval and a video showing the OAuth/API flow, even for a single intended user.
- Ready to test: business account verified; Trial approved; exact callbacks saved; OAuth test account available; access status recorded.

## Discord

Developer portal: [Discord Developer Portal](https://discord.com/developers/applications). Official reference: [OAuth2 and permissions](https://docs.discord.com/developers/platform/oauth2-and-permissions).

- App/product: create an application, generate a Client Secret, and configure OAuth2 redirects. Add a bot only when testing the separate guild-install capability.
- Credentials: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`. Optional guild-install configuration uses `DISCORD_BOT_TOKEN` and `DISCORD_PUBLIC_KEY` and must remain server-side.
- Callbacks: local `http://localhost:3000/api/integrations/discord/callback`; production `https://audienceown.com/api/integrations/discord/callback`. Register the production URI exactly in OAuth2 → Redirects.
- AudienceOwn scopes: exactly `identify` for stable current-user identity and `guilds` for the existing eligible-guild picker and approximate member counts. Ordinary account OAuth requests no bot, command, email, join, member-read, or write scopes. PKCE is disabled for the confidential client-secret Authorization Code Grant; signed state and nonce validation remain required.
- Test setup: create a private test server. Use an owner/admin or user with Manage Server authority. Configure a stable public invite only if the public destination flow requires one; never infer authority from an invite alone.
- Review: standard OAuth testing does not require a public app. Verify Discord verification/application requirements before broad distribution or privileged intent use.
- Ready to test: redirect exact; user belongs to test guild; authority is sufficient; credentials installed; optional bot/invite status recorded.

## LinkedIn

Developer portal: [LinkedIn Developer Apps](https://www.linkedin.com/developers/apps). Official references: [OpenID Connect sign-in](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2) and [3-legged OAuth](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow).

- App/product: create an app associated with a verified LinkedIn Page and request Sign In with LinkedIn using OpenID Connect. No Marketing or Community Management product is required for AudienceOwn's implemented member connection.
- Credentials: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`. Optional organization mode uses `LINKEDIN_ORGANIZATION_SOCIAL_ENABLED`, `LINKEDIN_REVIEW_STATUS`.
- Callbacks: local example `https://localhost:3000/api/integrations/linkedin/callback`; production `https://audienceown.com/api/integrations/linkedin/callback`.
- Redirect rules: callback URLs must be absolute HTTPS trusted URLs, cannot contain fragments, and must match the configured redirect. Use a trusted local TLS certificate or HTTPS development host.
- AudienceOwn scopes: exactly `openid`, `profile`.
- Test setup: use a controlled member for OIDC and verify the returned UserInfo `sub` persists as `external_account_id`.
- Review: OIDC proves the member session only. Programmatic refresh tokens are limited to approved partners and are not advertised by this integration.
- Ready to test: company Page association verified; OIDC product enabled; HTTPS callback exact; test member available.

## Spotify

Developer portal: [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). Official references: [apps](https://developer.spotify.com/documentation/web-api/concepts/apps), [redirect URIs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri), and [quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes).

- App/product: create a Web API app. It produces a Client ID and Client Secret and begins in Development Mode.
- Credentials: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`.
- Callbacks: local `http://127.0.0.1:3000/api/integrations/spotify/callback`; production `https://<production-host>/api/integrations/spotify/callback`.
- Redirect rules: exact HTTPS is required except explicit loopback IP literals, where HTTP is permitted. `localhost` is not accepted.
- AudienceOwn scope: `user-read-private`.
- Test setup: the Development Mode app owner must have active Premium. New Development Mode apps allow up to five authenticated users, each added to the allowlist.
- Review/quota: Extended Quota is for broader use; applications are currently limited to eligible organizations and active launched services. Spotify login proves the user account, not artist/show ownership.
- Ready to test: Premium owner active; callback uses `127.0.0.1`; test user allowlisted; credentials installed; quota mode recorded.

## Snapchat

Developer portal: [Snap Kit Developer Portal](https://kit.snapchat.com/portal/apps). Official references: [Login Kit](https://developers.snap.com/snap-kit/login-kit/overview), [Web OAuth](https://developers.snap.com/snap-kit/login-kit/Tutorials/web), and [submission/review](https://developers.snap.com/snap-kit/app-review/submission-and-review).

- App/product: create a Snap Kit project/app, enable Login Kit, configure the OAuth client and redirect, and use server-side Authorization Code + PKCE.
- Credentials: `SNAPCHAT_CLIENT_ID`, `SNAPCHAT_CLIENT_SECRET`, `SNAPCHAT_REDIRECT_URI`.
- Callbacks: repository local default `http://localhost:3000/api/integrations/snapchat/callback`; production `https://audienceown.com/api/integrations/snapchat/callback`. The operator must confirm the portal accepts the local default; otherwise use an exact HTTPS development origin and set the environment URI to that same value.
- AudienceOwn scopes: exactly the full scope URIs for `user.external_id` and `user.display_name`. Bitmoji avatar is not requested.
- Test setup: invite organization members, have them accept and sign in, then add their Snapchat usernames as Demo Users for Staging.
- Review: Developer Environment testing is available before approval. Production access requires App Review with use-case explanation, integration demonstration, policies, and reviewer instructions.
- Ready to test: Login Kit enabled; callback exact; Demo User admitted; credentials installed; environment and review status recorded.

## Callback matrix

| Provider | Local callback | Production callback |
| --- | --- | --- |
| Instagram | `http://localhost:3000/api/integrations/instagram/callback` | `https://<production-host>/api/integrations/instagram/callback` |
| Facebook | `http://localhost:3000/api/integrations/meta/callback` | `https://<production-host>/api/integrations/meta/callback` |
| TikTok | `https://localhost:3000/api/integrations/tiktok/callback` | `https://<production-host>/api/integrations/tiktok/callback` |
| X | `http://127.0.0.1:3000/api/integrations/x/callback` | `https://<production-host>/api/integrations/x/callback` |
| Twitch | `http://localhost:3000/api/integrations/twitch/callback` | `https://<production-host>/api/integrations/twitch/callback` |
| Pinterest | `http://localhost:3000/api/integrations/pinterest/callback` | `https://audienceown.com/api/integrations/pinterest/callback` |
| Discord | `http://localhost:3000/api/integrations/discord/callback` | `https://audienceown.com/api/integrations/discord/callback` |
| LinkedIn | `https://localhost:3000/api/integrations/linkedin/callback` | `https://<production-host>/api/integrations/linkedin/callback` |
| Spotify | `http://127.0.0.1:3000/api/integrations/spotify/callback` | `https://<production-host>/api/integrations/spotify/callback` |
| Snapchat | `http://localhost:3000/api/integrations/snapchat/callback` (confirm portal acceptance) | `https://<production-host>/api/integrations/snapchat/callback` |

## Operator readiness record

Complete this table after console setup. `Configured` in the command output is not evidence that callbacks, testers, or review are complete.

| Provider | Developer app | Credentials | Callback registered | Test user/account | Review | Ready for live QA |
| --- | --- | --- | --- | --- | --- | --- |
| Instagram | UNKNOWN | NO | UNKNOWN | UNKNOWN | UNKNOWN | BLOCKED |
| Facebook | UNKNOWN | NO | UNKNOWN | UNKNOWN | UNKNOWN | BLOCKED |
| TikTok | UNKNOWN | NO | UNKNOWN | UNKNOWN | UNKNOWN | BLOCKED |
| X | UNKNOWN | NO | UNKNOWN | UNKNOWN | N/A | BLOCKED |
| Twitch | UNKNOWN | NO | UNKNOWN | UNKNOWN | N/A | BLOCKED |
| Pinterest | UNKNOWN | NO | UNKNOWN | UNKNOWN | UNKNOWN | BLOCKED |
| Discord | UNKNOWN | NO | UNKNOWN | UNKNOWN | UNKNOWN | BLOCKED |
| LinkedIn | UNKNOWN | NO | UNKNOWN | UNKNOWN | UNKNOWN | BLOCKED |
| Spotify | UNKNOWN | NO | UNKNOWN | UNKNOWN | UNKNOWN | BLOCKED |
| Snapchat | UNKNOWN | NO | UNKNOWN | UNKNOWN | UNKNOWN | BLOCKED |

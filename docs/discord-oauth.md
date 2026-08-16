# Discord OAuth production notes

Verified against Discord's official developer documentation on 2026-08-11.

## Authorization model

- Authorization endpoint: `https://discord.com/oauth2/authorize`.
- Token and refresh endpoint: `https://discord.com/api/oauth2/token`. The form-encoded authorization-code request authenticates the confidential application with its client ID and server-only client secret and includes the code, `grant_type=authorization_code`, and exact redirect URI.
- Revocation endpoint: `POST https://discord.com/api/oauth2/token/revoke`, authenticated with the application's client ID and secret.
- The production redirect URI is `https://audienceown.com/api/integrations/discord/callback`. It must be registered exactly and is read only from server-side `DISCORD_REDIRECT_URI`.
- Scopes are exactly `identify guilds`. `identify` permits `GET /users/@me`; `guilds` permits `GET /users/@me/guilds`. AudienceOwn does not request email, connections, guild membership writes, bot installation, messages, webhooks, or application commands in this flow.
- PKCE is disabled for this confidential server-side flow. Discord documents application authentication with the client ID and secret and does not require a challenge or verifier. Signed state and the single-use nonce cookie remain mandatory.

The authorizing identity is the stable snowflake returned by `GET /users/@me`. The response includes stable `id`, `username`, optional `global_name`, and optional avatar hash. Discord has no public user-profile URL derived from that ID, so AudienceOwn does not invent one.

## Guild selection and authority

`GET /users/@me/guilds?limit=200&with_counts=true` returns the user's partial guild objects. The stable Discord user snowflake from `GET /users/@me` remains the connection's `external_account_id`. A selected guild stays separate as a `discord_guild` provider-asset binding and `selectedGuildId` relationship metadata.

A guild is eligible only when it is available and the partial guild says one of:

- `owner` is true;
- the effective permissions bitfield contains `ADMINISTRATOR` (`1 << 3`); or
- it contains `MANAGE_GUILD` / Manage Server (`1 << 5`).

Names and invite links never establish identity or authority. Zero eligible guilds produces a useful no-eligible-server state. Eligible guilds remain in `asset_selection_required` until the creator explicitly selects one. The picker shows friendly Owner, Administrator, or Manage Server labels, never the raw bitfield. Selection re-fetches eligible guilds server-side, prevents duplicate selected guilds across the creator, and preserves the original official/backup role without replacing the connected user's canonical ID.

Reconnect requires the same authorizing user snowflake and continued authority over the exact separately selected guild ID. Duplicate user identities and duplicate selected guilds are rejected.

## Member metric and public destination

When `with_counts=true`, current-user guild results may contain `approximate_member_count`. This is available through the existing `guilds` OAuth scope and does not require a bot. AudienceOwn stores it as an approximate member metric and refreshes it by re-reading the current user's guild list. A missing count remains unavailable rather than becoming zero.

Discord does not expose a canonical public guild page or permanent invite from the guild snowflake in this OAuth response. AudienceOwn therefore uses no fabricated `/channels/{guildId}` public URL and creates no invites. A selected guild remains private with `public_invite_required` until the creator supplies a validated `https://discord.gg/{code}` or `https://discord.com/invite/{code}` link. The separate optional bot workflow is reserved for explicitly configured announcement detection and is not part of account OAuth or member-count collection.

## Operations and review

Discord rate limits are route/bucket based and can change. Clients must inspect rate-limit headers and, on HTTP 429, honor `Retry-After` / `retry_after`; limits must not be hard-coded. AudienceOwn classifies 429 as retryable and keeps token/API failure details out of creator-visible errors.

The basic `identify` and `guilds` user OAuth flow does not use privileged Gateway intents. Bot verification and privileged-intent rules therefore do not apply to this authorization path. Production still requires a correctly configured Discord application, registered redirect, confidential client secret, privacy policy/terms as applicable, and compliance with Discord's Developer Terms and Policy. Readiness requires `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and `DISCORD_REDIRECT_URI`; if any is absent, Discord remains implemented but configuration-missing and not connectable. Development-mode application/tester restrictions in the Developer Portal must be cleared before broad production use.

Official references:

- [OAuth2](https://docs.discord.com/developers/topics/oauth2)
- [OAuth2 and Permissions](https://docs.discord.com/developers/platform/oauth2-and-permissions)
- [User Resource: current user and current user guilds](https://docs.discord.com/developers/resources/user)
- [Guild Resource](https://docs.discord.com/developers/resources/guild)
- [Rate Limits](https://docs.discord.com/developers/topics/rate-limits)

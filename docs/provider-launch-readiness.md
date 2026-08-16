# Multi-provider launch-readiness audit

Audit date: 2026-08-11. Status vocabulary is intentionally limited to `PASS`, `NOT TESTED`, `BLOCKED BY CREDENTIALS`, `BLOCKED BY REVIEW`, `NOT APPLICABLE`, and `FAILED`.

## Launch matrix

No provider is marked launchable without a completed real authorization lifecycle. “Credentials” means the required variables are non-empty in `.env.local`; it does not reveal or validate their values. “Developer app” and “Review” cannot be inferred from possession of credentials.

| Provider | Code | Credentials | Developer app | Callback | OAuth live | Identity live | Official | Backup | Refresh | Metric | Asset selection | Reconnect | Disconnect | Review | Launchable | Known limitation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| YouTube | PASS | PASS | NOT TESTED | PASS | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | Live OAuth and Google production verification were not available during this audit. |
| Instagram | PASS | BLOCKED BY CREDENTIALS | NOT TESTED | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY REVIEW | BLOCKED BY REVIEW | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY REVIEW | BLOCKED BY CREDENTIALS | Professional-account capabilities depend on Meta review and asset authority. |
| Facebook | PASS | BLOCKED BY CREDENTIALS | NOT TESTED | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY REVIEW | BLOCKED BY REVIEW | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY REVIEW | BLOCKED BY CREDENTIALS | Only selected managed Pages are public identities. |
| TikTok | PASS | BLOCKED BY CREDENTIALS | NOT TESTED | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY REVIEW | NOT APPLICABLE | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY REVIEW | BLOCKED BY CREDENTIALS | Statistics require approved scopes. |
| X | PASS | BLOCKED BY CREDENTIALS | NOT TESTED | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY REVIEW | NOT APPLICABLE | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY REVIEW | BLOCKED BY CREDENTIALS | Metrics/API use require an appropriate paid access tier. |
| Spotify | PASS | BLOCKED BY CREDENTIALS | NOT TESTED | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | NOT APPLICABLE | NOT APPLICABLE | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | NOT TESTED | BLOCKED BY CREDENTIALS | OAuth user identity is not an artist or show identity; no audience metric is claimed. |
| Twitch | PASS | BLOCKED BY CREDENTIALS | NOT TESTED | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | NOT APPLICABLE | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | NOT TESTED | BLOCKED BY CREDENTIALS | EventSub production setup remains separate from basic OAuth/follower count. |
| LinkedIn | PASS | BLOCKED BY CREDENTIALS | NOT TESTED | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | NOT APPLICABLE | BLOCKED BY REVIEW | BLOCKED BY REVIEW | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY REVIEW | BLOCKED BY CREDENTIALS | Member metrics are unsupported; organization followers require approved organization access. |
| Pinterest | PASS | BLOCKED BY CREDENTIALS | NOT TESTED | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY REVIEW | NOT APPLICABLE | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY REVIEW | BLOCKED BY CREDENTIALS | Production API access/review is not confirmed. |
| Discord | PASS | BLOCKED BY CREDENTIALS | NOT TESTED | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | NOT TESTED | BLOCKED BY CREDENTIALS | Guild selection requires owner/Manage Server authority; public presentation requires a creator invite. |
| Snapchat | PASS | BLOCKED BY CREDENTIALS | NOT TESTED | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | NOT APPLICABLE | NOT APPLICABLE | BLOCKED BY CREDENTIALS | BLOCKED BY CREDENTIALS | BLOCKED BY REVIEW | BLOCKED BY CREDENTIALS | Login Kit proves only an app-scoped user; Public Profiles use a separate allowlisted product. |

The configured database contains a YouTube official row and a YouTube backup row, proving the stored role model can represent both simultaneously. This is not counted as live OAuth QA because the audit could not reproduce authorization, token refresh, reconnect, or deletion.

## Environment audit

| Provider/shared facility | `.env.local` | `.env.example` |
|---|---|---|
| YouTube credentials + redirect | configured | configured placeholders |
| Instagram credentials + redirect | missing | configured placeholders |
| Facebook/Meta credentials + redirect | missing | configured placeholders |
| TikTok credentials + redirect | missing | configured placeholders |
| X credentials + redirect | missing | configured placeholders |
| Spotify credentials + redirect | missing | configured placeholders |
| Twitch credentials + redirect | missing | configured placeholders |
| LinkedIn credentials + redirect | missing | configured placeholders |
| Pinterest credentials + redirect | missing | configured placeholders |
| Discord credentials + redirect | missing | configured placeholders |
| Snapchat credentials + redirect | missing | configured placeholders |
| `SOCIAL_TOKEN_ENCRYPTION_KEY` | configured | configured placeholder |
| `SOCIAL_OAUTH_STATE_SECRET` | missing; shared state currently falls back to configured `YOUTUBE_OAUTH_STATE_SECRET` | configured placeholder |

The shared state fallback is cryptographically functional, but production should set a distinct `SOCIAL_OAUTH_STATE_SECRET` before enabling non-Google providers. X and Spotify use PKCE in the shared implementation; Snapchat intentionally uses a confidential authorization-code exchange without PKCE. All providers use signed state and nonce cookies.

## Callback registration matrix

Replace `<production-origin>` with the single deployed HTTPS origin. Query strings and trailing slashes must not be added unless the provider console is updated to the exact same value.

| Provider | Required local callback | Required production callback |
|---|---|---|
| YouTube | `http://localhost:3000/api/integrations/youtube/callback` | `https://<production-origin>/api/integrations/youtube/callback` |
| Instagram | `http://localhost:3000/api/integrations/instagram/callback` | `https://<production-origin>/api/integrations/instagram/callback` |
| Facebook | `http://localhost:3000/api/integrations/meta/callback` | `https://<production-origin>/api/integrations/meta/callback` |
| TikTok | `https://localhost:3000/api/integrations/tiktok/callback` | `https://<production-origin>/api/integrations/tiktok/callback` |
| X | `http://127.0.0.1:3000/api/integrations/x/callback` | `https://<production-origin>/api/integrations/x/callback` |
| Spotify | `http://127.0.0.1:3000/api/integrations/spotify/callback` | `https://<production-origin>/api/integrations/spotify/callback` |
| Twitch | `http://localhost:3000/api/integrations/twitch/callback` | `https://<production-origin>/api/integrations/twitch/callback` |
| LinkedIn | `https://localhost:3000/api/integrations/linkedin/callback` | `https://<production-origin>/api/integrations/linkedin/callback` |
| Pinterest | `http://localhost:3000/api/integrations/pinterest/callback` | `https://<production-origin>/api/integrations/pinterest/callback` |
| Discord | `http://localhost:3000/api/integrations/discord/callback` | `https://<production-origin>/api/integrations/discord/callback` |
| Snapchat | `http://localhost:3000/api/integrations/snapchat/callback` | `https://<production-origin>/api/integrations/snapchat/callback` |

TikTok and LinkedIn enforce HTTPS in the current registry validator. Spotify deliberately uses a loopback IP rather than `localhost`; X also uses a loopback IP. Production callbacks must always be HTTPS.

## Cross-provider findings

- Provider picker: all twelve providers have implemented registry entries; missing credentials render Setup required, reviewed products render App review required · Connect, and links preserve `role=official` or `role=backup`. Exact connected state is scoped by provider and role. This audit fixed backup-role duplicate selection and added keyboard focus containment.
- Multiple officials: `connected_accounts.account_type` scopes roles and `is_primary` remains false for generic provider OAuth. The partial unique index is per creator and account type, not a global single-official constraint. Provider projection queries all accounts in one batch.
- Exact isolation: secrets, audience metrics, refresh leases, reconnect, and removal use `connected_accounts.id`. Audience metric uniqueness includes exact connection or selected asset. Historical recovery foreign keys use `ON DELETE SET NULL`; provider-owned secrets/metrics use cascades.
- Metrics: zero remains a number and is rendered; null remains unknown. Unsupported providers are no longer scheduled by the audience worker. Retryable failures retain the last count with `stale`, use bounded exponential backoff, and preserve the connection.
- Refresh: the shared credential loader uses a connection lease, preserves an omitted refresh rotation, adopts returned rotation, updates expiry, and distinguishes retryable failure from reconnect-required invalid grants.
- Public destinations: Discord uses validated creator invites; Snapchat remains private until a creator URL is supplied; Spotify does not claim artist/show ownership; LinkedIn organization URLs only come from authorized organization data.
- Cache invalidation: connect/reconnect, exact removal, polling, initial metrics, and the metric worker invalidate dashboard, platforms, connected-account settings, creator page, and creator-scoped cache tags.
- Performance: dashboard/provider registry, account projection, assets, and metrics are fetched in bounded batch queries. Ordinary rendering does not call provider APIs. The worker uses leased batch claims rather than per-card provider queries.
- Security: no `NEXT_PUBLIC_*` provider secrets were found. Credential tables are server/service-role only with forced RLS. OAuth callbacks validate signed state, nonce, current viewer/creator, provider, role, and reconnect target. Debug sanitization redacts tokens, codes, state, cookies, secrets, keys, and verifiers. Browser routes receive normalized error states rather than raw provider responses.

## Blockers

### CRITICAL

1. The configured Supabase project is behind repository migrations: `platform_connection_secrets` and `provider_audience_metrics` return PostgREST schema-cache `PGRST205`, and the deployed `connected_accounts` shape lacks current columns (`42703`). OAuth credential persistence and audience metrics cannot launch against that database until migrations are applied and schema cache is refreshed.
2. Free/Pro connection entitlement enforcement is absent. The marketing page describes plan differences, but connection mutations have no billing entitlement that enforces Free = one official + one backup and Pro = unlimited. This must be implemented before paid-plan launch; the audit does not fabricate an entitlement.
3. No provider completed a reproducible live OAuth → identity → encrypted secret → metric/selection → reconnect → disconnect cycle during this audit. YouTube credentials are present, but interactive browser control was unavailable.

### IMPORTANT

1. Set a dedicated `SOCIAL_OAUTH_STATE_SECRET` rather than relying on the YouTube state-secret fallback.
2. The shared callback diagnostics cover callback start, exchange, identity, persistence outcome, and failure, but do not yet emit every requested fine-grained label (`state_validation`, `duplicate_lookup`, `secret_encrypt`, `secret_write`, `metric_write`, `snapshot`, and `revalidation`) as independent steps.
3. Full pgTAP execution is not clean in the current reused local database: four suites encounter pre-existing identity/social rows. The provider audience and expansion suites pass; CI/release must run the full database suite from a clean reset.
4. Browser-based responsive verification at 320/375/390/768/1024+ could not run because no browser runtime was available. Source and component tests confirm responsive grids, accessible dialog labels, Escape handling, focus restoration, and the newly added Tab containment, but this is not visual proof.

### EXTERNAL

- Eleven providers lack local credentials. Meta-family, TikTok, X, LinkedIn organization, Pinterest, and Snapchat require provider review/tier approval for advertised restricted capabilities. Discord/Twitch developer-console configuration and webhooks/bot products remain external where used.

### OPTIONAL

- Add automated visual snapshots for every picker viewport and a clean disposable Supabase test database in CI.

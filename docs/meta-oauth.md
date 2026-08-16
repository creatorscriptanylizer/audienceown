# Meta OAuth capability matrix

AudienceOwn treats Instagram and Facebook Pages as distinct provider connections. It never infers one identity from another or uses a display name as a stable key.

| Provider | Authorization and identity | Required scopes | Assets | Token lifecycle | Audience metric | Review/account requirements |
| --- | --- | --- | --- | --- | --- | --- |
| Instagram | Instagram API with Instagram Login on `graph.instagram.com`; stable professional account ID and profile fields | `instagram_business_basic` | Directly authorized Business or Creator account; no Facebook Page required | Short-lived code token is exchanged for a long-lived token; a valid long-lived token is refreshed with `ig_refresh_token` | `followers_count`, when granted and available | Business or Creator account; third-party creators require the applicable Advanced Access/App Review |

For Instagram Login identity, the OAuth token response `user_id` identifies the
app-scoped user node and must match the token-authenticated `/me.id`. The separate
`/me.user_id` is the Instagram professional account ID. AudienceOwn therefore
persists `/me.user_id` as `connected_accounts.external_account_id` and uses it for
duplicate detection, reconnects, refresh/revalidation, and subsequent account API
requests. Both fields are parsed as exact decimal strings; neither is converted
through JavaScript `Number`.
| Facebook | Facebook Login followed by `/me/accounts`; the login user is never stored as the public destination | `pages_show_list`, `pages_read_engagement`, `pages_read_user_content`, plus `instagram_basic` for linked Instagram discovery | Explicit managed Page selection; linked professional Instagram accounts are separate selectable assets | User token is exchanged for a long-lived token; selected Page token is stored for the selected connection | Page `followers_count`, when granted and available | Managed Pages only; advanced Page permissions require review |

Only safe relationship identifiers—Page ID, professional Instagram ID, and parent asset ID—are stored in provider metadata. Access tokens are encrypted in `platform_connection_secrets` or `provider_asset_secrets`.

## Deterministic redirect URIs

- Instagram local: `http://localhost:3000/api/integrations/instagram/callback`
- Instagram production: `https://<production-host>/api/integrations/instagram/callback`
- Facebook local: `http://localhost:3000/api/integrations/meta/callback`
- Facebook production: `https://<production-host>/api/integrations/meta/callback`

Configuration is server-only: `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET`, `INSTAGRAM_REDIRECT_URI`, `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, `SOCIAL_OAUTH_STATE_SECRET`, and `SOCIAL_TOKEN_ENCRYPTION_KEY`.

## Official references

- [Instagram API with Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/)
- [Instagram access tokens](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login/)
- [Facebook access tokens](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/)
- [Facebook Pages API getting started](https://developers.facebook.com/docs/pages-api/getting-started/)

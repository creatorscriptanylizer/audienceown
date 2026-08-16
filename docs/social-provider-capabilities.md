# Social provider capabilities

| Provider | OAuth | Automatic detection | Source | Availability |
|---|---:|---:|---|---|
| YouTube | Yes | Videos/live | Polling | Credentials required |
| Twitch | Yes | Live events | EventSub | Credentials required |
| Spotify | Yes | Releases after artist selection | Polling | Credentials required |
| TikTok | Yes | Public videos | Polling/webhook | Provider review required |
| X | PKCE | Posts | Polling | Product tier/review required |
| Instagram | Yes | Professional media | Polling/webhook | Meta review required |
| Facebook | Yes | Page content/live | Polling/webhook | Meta review required |
| Pinterest | Yes | Selected-board Pins | Polling | Review required |
| Discord | Bot OAuth | Filtered announcements | Events | Bot/event setup required |
| LinkedIn | Yes | Only with approved read product | Otherwise manual | Review required |
| Snapchat | Login Kit | No official public-content read | Manual import | Manual-import-only |

Capabilities are server-registered. Missing credentials disable only that provider.
Connection-only and manual-import-only states never expose an automation toggle.

AI enhancement is a provider-neutral optional layer after these detection
capabilities. It neither adds provider access nor expands auto-send permissions.
## Expansion II capability boundary

TikTok supports OAuth identity and approved `video.list` polling. Instagram supports professional accounts through a correctly configured Instagram Login or Facebook Login mode. Facebook supports selected managed Pages. All three support manual import/verification fallbacks and approval-first drafts; none supports provider publishing.
Stage 8.4 detection is conditional: X requires an entitled plan and LinkedIn requires restricted products and organization authority. Both offer manual fallback and disable provider publishing.
# Expansion IV capability matrix

| Provider | OAuth identity | Asset authority | Automatic detection | Manual fallback | Publishing |
|---|---|---|---|---|---|
| Spotify | Account | Artist gated; show via verified feed | Only authoritative selected asset | Yes | Disabled |
| Snapchat | Login Kit | Public Profile separately allowlisted | Only when approved API data is durable | Yes | Disabled |
| Pinterest | Account | Explicit public boards; claimed site corroboration | Selected public Pins | Yes | Disabled |
| More platforms | None | Domain/challenge/manifest/review | Unavailable | Required | Disabled |
## Audience capability

Audience fields, units, access requirements, and polling intervals are centralized in `lib/platform-audience/capabilities.ts`. Restricted product access defaults to blocked, and manual services receive no audience metric.

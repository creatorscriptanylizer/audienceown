# Provider audience metric capabilities

The executable registry is `lib/platform-audience/capabilities.ts`; it drives units, access states, intervals, approximation, and source documentation. Access is never presumed approved.

| Provider | Official object and field | Unit | Access / accuracy |
|---|---|---|---|
| YouTube | Channel `statistics.subscriberCount`; `hiddenSubscriberCount` | Subscribers | Read-only; rounded down to 3 significant figures; may be hidden |
| Instagram | Selected professional account `followers_count` | Followers | Instagram product permissions/review required; exact when returned |
| TikTok | `/v2/user/info` `follower_count` | Followers | `user.info.stats` scope and review; exact when returned |
| X | User `public_metrics.followers_count` | Followers | API tier and `users.read`; exact when returned |
| Spotify | Selected Artist `followers.total` | Followers | Artist asset only; exact; listener accounts and monthly listeners excluded |
| Twitch | Channel Followers response `total` | Followers | Broadcaster identity; exact total only, no follower records retained |
| LinkedIn | Unsupported for member OIDC | — | Personal follower/connection counts are unavailable; no restricted scopes are requested |
| Facebook | Selected Page `followers_count` | Followers | Page permission/product review; Page likes excluded |
| Snapchat | Selected Public Profile | Subscribers | Allowlisted Public Profile authority required; currently unavailable by default |
| Pinterest | User account `follower_count` | Followers | Approved user-account read access; board followers excluded |
| Discord | Selected guild `approximate_member_count` with counts | Members | Bot guild authority; approximate; no member list |

Official references are linked directly from the executable registry. Provider review or allowlist state must be represented in stored entitlement/review state before restricted requests are enabled.

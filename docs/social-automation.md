# YouTube social automation

## Architecture

Stage 4.0 extends `connected_accounts` for YouTube-specific watch settings and
health. OAuth credentials are encrypted by the application and stored only in
the service-role-only `platform_connection_secrets` table. The scheduler claims
connections through `claim_youtube_connections`, polls their uploads playlist,
and writes append-only `social_detection_events`. `ingest_youtube_detection`
and the unique provider/connection/object/event constraint make retries and
concurrent polling idempotent.

`create_youtube_draft` creates a normal `creator_updates` draft and links it
through `imported_social_content`. It also creates the creator-scoped activity
“New YouTube content detected — A draft is ready for review.” Drafts use the
existing editor, publication queue, delivery rules, and public creator page.

## Google setup

Create a Google Cloud OAuth web client, enable YouTube Data API v3, and register
the exact callback URL:

`https://YOUR-ORIGIN/api/integrations/youtube/callback`

Configure:

```text
GOOGLE_YOUTUBE_CLIENT_ID=
GOOGLE_YOUTUBE_CLIENT_SECRET=
GOOGLE_YOUTUBE_REDIRECT_URI=
YOUTUBE_OAUTH_STATE_SECRET=
SOCIAL_TOKEN_ENCRYPTION_KEY=
SOCIAL_WORKER_SECRET=
SOCIAL_POLL_INTERVAL_MINUTES=5
```

All except the interval are secrets and must never use `NEXT_PUBLIC_`. Use long,
independent random values for the state, token-encryption, and worker secrets.
Rotating the encryption key requires reauthorizing existing connections.

The OAuth state is signed, expires after ten minutes, is bound to the signed-in
user and creator, and is paired with an HttpOnly SameSite cookie. The callback
exchanges the one-time code, loads the owned channel with `channels.list`, and
stores encrypted access/refresh tokens. Codes, tokens, client secrets, and full
provider responses are never logged.

## Polling and quota

Call `POST /api/internal/social/youtube/poll` every 5–10 minutes with
`Authorization: Bearer $SOCIAL_WORKER_SECRET`. The cadence may be changed for
quota or freshness needs. A bounded request body such as `{"limit":10}` is
recommended. Claims use `FOR UPDATE SKIP LOCKED` and a short lease, preventing
overlapping work for one connection.

The watcher reads at most ten recent entries from the channel uploads playlist,
stops at the stored video cursor, and requests details only for unseen IDs. It
does not rescan channel history. Standard public videos and scheduled, started,
or completed livestreams are normalized. Private, deleted, or unavailable
items are ignored; missing thumbnails remain null. Malformed payloads and
transient/429/5xx failures mark the connection degraded. Quota exhaustion is
recorded without a tight retry. Expired access tokens are refreshed; missing or
revoked refresh authorization marks the connection expired/revoked and the UI
offers reconnect.

Out-of-order provider events are safe because each event has its own unique key,
while the update has a second unique creator/provider/object key. Thus one
YouTube object can create only one draft even if scheduled/live/completed events
arrive in an unexpected order.

## Approval, sending, and public pages

Watching and draft creation turn on after connection. `auto_send` is off by
default and requires a separate warning acknowledgement. Approval consists of
opening the generated draft and using the existing publish/schedule controls.
Automatic publication calls the same recipient preparation and atomic
`publish_update_delivery_queue` path; it never inserts delivery rows itself.
Verified-method, preference, Recovery Pass, deduplication, and retry rules are
unchanged. If there is no eligible audience, the draft remains available and a
creator activity reports the failure. Sent updates are read by the existing
public `/c/[slug]` page.

Disconnect removes encrypted credentials and disables watching/auto-send while
retaining safe history. Reconnect repeats OAuth and restores health. Google
revocation is attempted by operators where required; local disconnect always
prevents further API access and deletes locally stored tokens.

## Analytics and privacy

`get_youtube_automation_analytics()` and
`GET /api/analytics/social/youtube` return creator-scoped totals for detections,
imports, drafts, approvals, automatic publications, ignored/duplicate events,
failures, content types, and average detection/approval/publication latency.
They contain no follower identity, OAuth credential, or unrestricted provider
payload.

## Recovery and operations

Structured logs use stable event names (`connection_established`,
`token_refreshed`, `poll_started`, `content_detected`, `duplicate_ignored`,
`poll_completed`, `automatic_publication`, and `provider_failure`) plus safe IDs
and categories only. Investigate degraded health, then retry on the next normal
schedule. Expired/revoked connections require creator reconnection. A crashed
worker's lease expires automatically.

Local tests mock Google responses and require no network or credentials:

```bash
npm run test
npx supabase test db
```

For production, configure a scheduler to invoke the internal polling endpoint
over HTTPS every 5–10 minutes, store its bearer secret in the scheduler's secret
manager, alert on non-2xx results, and keep batches bounded.

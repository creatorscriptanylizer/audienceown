# Delivery operations

Live incident analytics excludes queued-only records and deduplicates recipients across transports and retries. See [metric definitions](recovery-metric-definitions.md).

AudienceOwn operates one delivery queue and one canonical lifecycle:
`queued → sending → accepted → delivered`, with `bounced`, `complained`,
`failed`, `skipped`, and `cancelled` terminal outcomes as defined by the
database transition guard. Provider acceptance is not delivery confirmation,
and WhatsApp `read` callbacks remain audit events without adding a lifecycle
state.

## Access and audit

Set `DELIVERY_OPERATOR_USER_IDS` to a comma-separated list of trusted Supabase
user UUIDs. `DELIVERY_ADMIN_USER_IDS` grants the reserved admin role. Creators
are not operators by default. Operator routes authenticate the current Supabase
user, require same-origin mutations, apply a mutation rate limit, and invoke
service-role-only row-locking RPCs. Every successful mutation appends a
`delivery_operator_actions` record. Audit records cannot be updated or deleted.

The operations UI is at `/dashboard/operations/deliveries`. It never displays
raw destinations, destination hashes, provider payloads, credentials, OTPs, or
management tokens.

## Retry and stuck-delivery policy

A delivery is stuck when it remains `sending` for 15 minutes. Release is safe
only when no provider message ID exists. If a provider message ID exists,
reconcile callbacks first to avoid duplicate delivery. Release returns the row
to the same queue with the same update, recipient snapshot, destination,
transport, and provider. Exhausted attempts become failed.

Manual retry is limited to failed deliveries with fewer than three attempts and
a transient classification. The selected recovery method must remain verified,
active, and unrevoked. Permanent destination, consent, policy, template, sender,
and configuration failures cannot be retried. Manual retry never rebuilds the
audience and never changes transport. Transport fallback is prohibited because
the selected Recovery Pass is authoritative and consent is channel-specific.

## Callback reconciliation

Signed callbacks are first appended to `update_delivery_events`. A callback
that arrives before provider SID persistence remains pending. The bounded
reconciliation function matches the authoritative `(provider,
provider_message_id)` pair and then calls the existing monotonic event
processor. It does not fabricate provider state. Delivered cannot regress to
accepted or failed.

## Health and thresholds

`GET /api/health/deliveries` exposes only safe counts, classification, and
provider availability. Operator views include detailed aggregate health.
Defaults can be overridden with:

- `DELIVERY_ALERT_QUEUE_DEPTH=100`
- `DELIVERY_ALERT_STUCK_COUNT=1`
- `DELIVERY_ALERT_PENDING_CALLBACK_COUNT=10`
- `DELIVERY_ALERT_FAILURE_RATE_PERCENT=20`
- `DELIVERY_ALERT_OLDEST_QUEUE_SECONDS=900`

Crossing a threshold is degraded; crossing twice a threshold is unhealthy.
Stage 3.0 does not send outbound alerts.

## Incident runbooks

### Queue not draining or deliveries stuck

Confirm dispatcher activity and worker authentication, inspect oldest queued
age, and check provider readiness. For `sending` rows older than 15 minutes,
reconcile any row with a provider message ID. Release only rows without one.

### High provider failure rate

Group failures by provider and classification. Pause manual retry for permanent
failures. For Twilio or Resend outages, retain the original transport and wait
for provider recovery before retrying eligible rows. For increasing web-push
failures, distinguish invalid subscriptions from temporary provider failures.

### Callbacks accumulating

Verify the exact externally visible signed callback URL and webhook credentials.
Run bounded reconciliation. A callback received before provider SID persistence
should reconcile after acceptance records the SID.

### WhatsApp template disabled

Confirm Meta/Twilio template state and the configured Content SID. Template
paused, disabled, or unapproved failures are permanent and must not be retried
until a new eligible publication occurs after configuration is repaired.

## Logging safety

Logs may contain delivery, update, provider, transport, attempt, event, and
action identifiers. Never log destinations, phone numbers, email addresses,
push endpoints, OTPs, auth tokens, Twilio signatures, webhook bodies, Resend
secrets, or VAPID private keys.

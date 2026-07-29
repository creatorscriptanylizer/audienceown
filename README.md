# AudienceOwn Stage 1

AudienceOwn tests one question: will creators publish an AudienceOwn page and place its link in their social bios?

## Product surface

- Supabase email/password and Google OAuth authentication, password reset, and TOTP MFA
- One canonical `public.creators` record per `auth.users` identity
- Collision-safe public pages at `/c/[slug]`
- Profile and banner uploads in the public `creator-media` bucket, with owner-path Storage RLS
- Official and backup accounts through `public.connected_accounts`
- One current manual public announcement; no broadcast, scheduling, tracking, queue, or delivery infrastructure
- Encrypted subscriber contacts through the canonical follower tables
- Token-based `/preferences/[token]` and `/unsubscribe/[token]` routes
- Creator-owned audience dashboard and trusted server-side CSV export

## Environment

Copy the Supabase project values into `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=
CONTACT_ENCRYPTION_KEY=
RESEND_API_KEY=
DELIVERY_EMAIL_FROM=
DELIVERY_WORKER_SECRET=
```

`SUPABASE_SERVICE_ROLE_KEY`, `CONTACT_ENCRYPTION_KEY`, `RESEND_API_KEY`,
`DELIVERY_EMAIL_FROM`, and `DELIVERY_WORKER_SECRET` are server-only. Never
prefix them with `NEXT_PUBLIC_`.

Apply [the Stage 1 migration](supabase/migrations/20260724000000_stage_one.sql), deploy the `subscribe`, `preferences`, and `unsubscribe` Edge Functions, and set `CONTACT_ENCRYPTION_KEY` in both the application and Edge Function environments. Media uses explicit public URLs; contact values remain encrypted and have no browser-readable policy.

## Verification

```bash
npm run check
npm run build
```

## Recovery Analytics

Creators can inspect privacy-safe recovery coverage, selected transport
distribution, daily trends, setup-state funnels, and recovery broadcast
performance at `/dashboard/analytics/recovery`. Analytics remain creator-scoped
and never expose destinations, hashes, endpoints, or fan identities.

Configure the `RECOVERY_ANALYTICS_*` thresholds shown in `.env.example`.
Historical coverage begins with Stage 3.1 daily snapshots; invoke
`capture_recovery_daily_snapshots(limit)` once daily from a trusted
service-role job. See [Recovery Analytics](docs/recovery-analytics.md) for
definitions, suppression rules, and historical limitations.

## Delivery execution

Audience preparation creates transport-specific `queued` rows without sending.
The bounded delivery worker atomically claims eligible rows, changes them to
`sending`, dispatches the transport already recorded on the row, and records
provider acceptance as `sent`. Provider callbacks and `delivered` confirmation
are deferred.

Email uses Resend when `RESEND_API_KEY` and `DELIVERY_EMAIL_FROM` are configured.
`RESEND_FROM_EMAIL` remains accepted for compatibility. Every transport fails
closed when its own configuration is unavailable and never falls back.

## Twilio WhatsApp Recovery Pass

For local development, join a consenting test handset to the Twilio WhatsApp
Sandbox and configure its `whatsapp:+…` sender. Production requires a registered
WhatsApp sender, Meta business verification, and an approved Content Template.
Set `TWILIO_WHATSAPP_SENDER` and the approved template's
`TWILIO_WHATSAPP_RECOVERY_CONTENT_SID` (`HX` followed by 32 hexadecimal
characters). The template must use variables 1–3 for creator name, summary, and
the AudienceOwn recovery URL.

Configure Twilio's status callback as:

`https://YOUR-CANONICAL-ORIGIN/api/webhooks/whatsapp/twilio`

Configure inbound messages as:

`https://YOUR-CANONICAL-ORIGIN/api/webhooks/whatsapp/twilio/inbound`

Twilio signs the exact externally visible URL, so `NEXT_PUBLIC_APP_URL` must be
the same HTTPS origin and proxies must not rewrite these paths. Sandbox delivery
is limited to joined numbers and is not production proof. Before production,
verify sender approval, Meta verification, template approval, Content SID,
Verify's WhatsApp channel, callbacks, inbound opt-out, secrets, and a controlled
end-to-end delivery with a consenting test handset.

Temporary failures return to `queued` while fewer than three attempts have been
made. Permanent failures, and temporary failures on the third attempt, become
`failed`. A `sending` row is eligible for recovery only after 15 minutes.

Invoke one bounded batch through the protected internal endpoint:

```bash
curl -X POST http://localhost:3000/api/internal/deliveries/dispatch \
  -H "Authorization: Bearer $DELIVERY_WORKER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"limit":10}'
```

The endpoint is disabled when `DELIVERY_WORKER_SECRET` is absent, accepts at
most 25 deliveries, returns aggregate and safe per-delivery results, and never
returns destinations. Only service-role database functions can claim or
complete deliveries.

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

## Delivery execution

Audience preparation creates transport-specific `queued` rows without sending.
The bounded delivery worker atomically claims eligible rows, changes them to
`sending`, dispatches the transport already recorded on the row, and records
provider acceptance as `sent`. Provider callbacks and `delivered` confirmation
are deferred.

Email uses Resend when `RESEND_API_KEY` and `DELIVERY_EMAIL_FROM` are configured.
`RESEND_FROM_EMAIL` remains accepted for compatibility. SMS, WhatsApp, and
browser notifications return a permanent `provider_not_configured` failure and
never fall back to email.

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

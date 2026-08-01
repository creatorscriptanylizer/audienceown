# AudienceOwn Stage 1

Stage 8.2 adds first-class Twitch, Discord, and podcast/RSS sources through the existing identity and content systems. See [Provider Expansion I](docs/provider-expansion-one.md).

Stage 8.1 adds continuous maintenance of verified ecosystem destinations. See [ecosystem automation](docs/ecosystem-automation.md), the [versioned policy](docs/ecosystem-automation-policy.md), and [operations guide](docs/ecosystem-automation-operations.md).

Stage 8.0 adds Ecosystem Connect: verified communities, developer and organization presences, memberships, newsletters, podcasts, applications, and official services projected into the canonical identity graph. See [Ecosystem Connect](docs/ecosystem-connect.md) and the [public ecosystem API](docs/public-ecosystem-api.md).

Stage 7.0 adds Verified Creator Cards, canonical `/verify/:slug` records, safe embeds and QR links, and optional Ed25519 assertions on top of the existing identity graph. See [public authenticity](docs/public-authenticity.md) and [authenticity assertions](docs/authenticity-assertions.md).

Stage 7.1 adds portable manifests, exact account lookup, signed continuity statements, safe event feeds, domain discovery, server webhooks, and an issuer-pinned TypeScript SDK. See [Authenticity Network](docs/authenticity-network.md).

Creator identity now includes deterministic explainable trust (`identity-trust-v1`) with independent provider families, freshness decay, actionable recommendations, creator-only history/analytics, and a reduced public projection. Raw scores remain server-side. See [the trust engine guide](docs/identity-trust-engine.md).

Continuous identity monitoring (`identity-monitoring-v1`) detects authoritative changes, safely updates the canonical graph, queues trust response, and raises private creator incidents without automatically activating emergencies or notifying followers. See [the monitoring guide](docs/identity-monitoring.md).

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

## YouTube social automation

Creators can connect a YouTube channel at `/dashboard/platforms`. AudienceOwn
polls the channel uploads playlist, creates one editable update draft per
YouTube object, and requires approval by default. Optional automatic sending is
an explicit per-connection setting and reuses the normal atomic publication
queue. Configure the `GOOGLE_YOUTUBE_*`, `YOUTUBE_OAUTH_STATE_SECRET`,
`SOCIAL_TOKEN_ENCRYPTION_KEY`, and `SOCIAL_WORKER_SECRET` values shown in
`.env.example`. See [YouTube social automation](docs/social-automation.md).

Stage 4.1 generalizes this pipeline through a registered, capability-aware
provider system. Generic routes live under `/api/integrations/[provider]`,
verified webhook ingress is `/api/webhooks/social/[provider]`, and the bounded
worker is `/api/internal/social/poll`. Providers without official content-read
access remain connection-only or manual-import-only and never display fake
automation. See [provider architecture](docs/social-provider-architecture.md)
and the [capability matrix](docs/social-provider-capabilities.md).

## AI-assisted drafts

Optional Stage 4.2 enhancement creates structured, creator-configurable variants
after deterministic social draft creation. AI is disabled by default and the app
works without `OPENAI_API_KEY`. Results are revision-checked before touching the
canonical draft, approval remains the default, and publishing still uses the
atomic delivery pipeline. See [AI draft enhancement](docs/ai-draft-enhancement.md),
[prompt safety](docs/ai-prompt-safety.md), and [operations](docs/ai-operations.md).

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

## Creator identity graph

Stage 6.0 maintains one stable-ID-anchored identity graph for every creator, projecting verified provider connections, emergency replacements, and domains into the dashboard and public creator page. See [Creator identity graph](docs/creator-identity-graph.md), [identity synchronization](docs/identity-synchronization.md), and the [public identity API](docs/public-identity-api.md).
Stage 8.3 extends the provider registry with review-aware TikTok Display API support and explicitly selected Instagram professional/Facebook Page assets. See [Provider Expansion II](docs/provider-expansion-two.md).
Stage 8.4 adds plan-aware X, restricted-product LinkedIn, and distinct Threads support. See [Provider Expansion III](docs/provider-expansion-three.md).
# Stage 8.5 provider coverage

The fixed social-provider list is complete with Spotify account OAuth and verified-feed show linkage, Snapchat Login Kit with separately gated Public Profile capability, Pinterest read-only boards/Pins/claimed-site support, and SSRF-safe manual services. See [Provider Expansion IV](docs/provider-expansion-four.md). All detections remain approval-first; provider publishing is disabled.

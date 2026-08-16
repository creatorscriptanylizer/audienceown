# Social provider architecture

Platform dashboard tiles use connection health only. Audience counts remain unavailable until approved authoritative counts and source timestamps are stored.

Stage 8.2 extends this registry with shared provider readiness, source discovery, authority verification, constrained manual fallback, and destination synchronization. See [Provider Expansion I](provider-expansion-one.md).

Stage 4.1 uses one registered, typed provider subsystem under `lib/social-providers`.
Adapters declare capabilities and implement only official API operations. Unsupported
operations throw `provider_capability_not_supported`; browser strings never select
unregistered providers.

Generic OAuth routes bind creator, user, provider, nonce, expiry, and optional PKCE
challenge into signed state. Tokens remain AES-GCM encrypted in the forced-RLS,
service-only secret table. Refresh-token rotation replaces the encrypted refresh
token atomically.

Polling calls `claim_social_connections`, which uses `FOR UPDATE SKIP LOCKED`,
lease ownership, expiry, provider cadence, and bounded batches. Normalized objects
must have a trustworthy ID, HTTPS provider URL, and publication timestamp.
`ingest_social_detection` and `create_social_draft` provide transactional database
dedupe. All providers create canonical `creator_updates` drafts. Approval remains
the default; auto-send remains explicit and uses the atomic delivery queue.

Verified webhook events enter `/api/webhooks/social/[provider]`. Each adapter owns
signature, timestamp, challenge, and replay checks. A unique provider event receipt
and detection keys make webhook retries idempotent. The generic worker is
`POST /api/internal/social/poll`; the YouTube path remains a compatibility wrapper.

Manual imports accept only registered provider HTTPS hosts, creator-entered title
and publication time, and optional HTTPS thumbnail. They never scrape pages.
Analytics are available at `/api/analytics/social` and
`/api/analytics/social/[provider]`.

After `create_social_draft` stores deterministic copy, an enabled creator AI
profile may enqueue a separate enhancement job. The AI worker never runs inside
social ingestion transactions or polling leases. See `ai-draft-enhancement.md`.
# Identity graph projection

Provider adapters remain the only provider-identity integration layer. Stage 6 synchronization reuses their identity fetchers and encrypted connection credentials, then projects safe stable identity into `creator_identity_accounts`. It does not add OAuth implementations or token storage.
## Stage 8.3

TikTok, Instagram, and Facebook implement the shared capability/readiness contract. Instagram and Facebook reuse one Meta OAuth, Graph pagination, asset-discovery, token-security, webhook-verification, and reconciliation foundation. The generic worker contains no provider delivery behavior.
## Stage 8.4

X and LinkedIn implement the shared readiness and normalized ingestion contracts. Their encrypted provider credentials remain in the existing credential store. Stream and webhook signals only schedule authoritative reconciliation.
# Stage 8.5 extension

Spotify, Snapchat, and Pinterest use the same registry, signed OAuth state, encrypted secrets, assets, content sources, polling, detections, drafts, monitoring, identity, trust, and authenticity paths. Manual services are destinations, not speculative provider adapters. The named provider list is fixed.
## Aggregate audience metrics

Audience synchronization reuses provider adapters, encrypted credentials, connected accounts, and selected asset bindings. The separate metric snapshot is aggregate-only and does not create a parallel OAuth or identity system. See `platform-audience-metric-capabilities.md`.
# Official audience capability registry

Main-account audience rules live in `lib/platform-audience/capabilities.ts`: official field availability, unit, selected-asset and scope requirements, review state, approximation and hidden-count behavior, sync interval, and rate-limit class. Provider adapters runtime-validate responses and persist aggregate integers only.

# Public authenticity

Public authenticity may include verified official ecosystem destinations. Serializers exclude stable/internal IDs, permissions, scopes, evidence, errors, private communities, and private membership data.

Stage 7.1 reuses this exact serializer for network manifests, lookups, feeds, and proofs; those projections never become identity truth.

Stage 7.0 adds a presentation layer over the Creator Identity Graph. It does not copy or replace identity, trust, monitoring, or emergency truth. A public record is available only when the creator page and authenticity profile are enabled, the identity is not archived, and policy permits display.

States are `strongly_verified_identity`, `verified_identity`, `verification_needs_attention`, `identity_unverified`, `verification_restricted`, and `emergency_recovery_active`. Emergency recovery takes presentation priority. Restricted state removes accounts, domains, relationships, and verified badges without publishing the internal reason.

Verification means AudienceOwn has current control and continuity signals for the displayed accounts and domains. It does not certify character, content quality, legality, financial safety, or permanence. The safe serializer never emits scores, weights, provider identifiers, connection identifiers, evidence, errors, recommendations, monitoring incidents, alerts, or follower data.

`GET /api/public/creators/:slug/authenticity` is deterministic, uses ETags, and uses short caches. Restricted and active-emergency output is `no-store`. `GET /verify/:slug` is canonical. QR codes contain only that canonical URL. Aggregate analytics are creator-scoped and contain no IP, fingerprint, or follower identifier.

Operations use `POST /api/internal/authenticity/issue` and `GET /api/internal/authenticity/health` with `AUTHENTICITY_WORKER_SECRET`. Public output continues unsigned when signing is unavailable.
Verified selected TikTok profiles, Instagram professional profiles, and Facebook Pages may expose safe labels, canonical profile links, and approved update links. Stable IDs, permissions/scopes, review and token health, webhook state, provider errors, and expiring/private media URLs are never public.
Verified Stage 8.4 accounts may expose safe labels, handles, canonical profiles, availability, verification dates, and approved content links. X IDs, LinkedIn URNs, Threads IDs, roles, tiers, scopes, cursors, rate limits, and errors remain private.
# Expansion IV public fields

Public output may include verified display labels, handles, canonical links, categories, safe availability, and verification-method labels. It excludes Spotify/Snapchat/Pinterest stable IDs, tokens, scopes, review details, errors, private board state, challenge values, and evidence.

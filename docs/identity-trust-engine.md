# Explainable identity trust engine

Ecosystem signals are grouped by provider family (`github`, `discord`, `patreon`, `domain`, newsletter, podcast, application store, or other). Multiple destinations in one family cannot inflate independent-signal strength; popularity, revenue, membership, stars, and engagement are excluded.

Public authenticity maps the current safe trust state to a fixed label. It never exports the internal score, signal weights, evidence, or recommendations.

Stage 6.1 derives creator trust from the Stage 6.0 canonical identity graph. It does not introduce a second identity record or an editable score. `creator_identity_profiles.identity_revision` changes whenever an account, domain, or relationship changes; evaluations record that source revision and become stale when it advances.

The `identity-trust-v1` evaluator runs transactionally through `evaluate_creator_trust`. It writes an immutable evaluation, deduplicated signals, deterministic recommendations, and a state-transition event. Browser roles cannot evaluate or write trust data. A bounded worker claims only profiles whose evaluation expired or whose revision changed.

States are `unverified`, `partially_verified`, `verified`, `strongly_verified`, `needs_attention`, and `restricted`. Signal states are `strong`, `valid`, `stale`, `weak`, `pending`, `revoked`, `conflicting`, and `unavailable`. Revoked/conflicting signals are blockers; stale/unavailable signals are warnings. State rules take precedence over the internal 0–100 value.

Provider families prevent correlated evidence from being overcounted: Google, Meta, ByteDance, X, Spotify, Twitch, LinkedIn, Pinterest, Discord, Snapchat, domain, and other. Strong verification needs two strong independent families. A creator-owned domain and YouTube are independent; Facebook and Instagram are not.

Configure freshness with `TRUST_PROVIDER_FRESHNESS_HOURS` (default 168), `TRUST_DOMAIN_FRESHNESS_HOURS` (720), `TRUST_EMERGENCY_REPLACEMENT_FRESHNESS_HOURS` (24), and `TRUST_EVALUATION_TTL_MINUTES` (60). Configure optional worker scheduling with `TRUST_WORKER_BATCH_SIZE` (20) and `TRUST_WORKER_SECRET`. The app boots without worker configuration.

The worker calls `POST /api/internal/identity/evaluate-trust` with the exact bearer secret. Schedule it near the evaluation TTL and after identity sync. Retries are safe for the same source revision and policy version.

Monitoring-relevant graph mutations advance `identity_revision`, allowing the existing trust lease to claim one idempotent reevaluation. Monitoring incident APIs never expose the internal score.

Limitations: current policy uses only repository-backed ownership, verification, freshness, presentation, stable-ID, sync, domain, and replacement evidence. It deliberately ignores popularity, followers, account age, and unverifiable provider claims. Organization verification remains a future, explicitly versioned policy boundary.
TikTok contributes the ByteDance family. Facebook Pages and Instagram professional accounts both contribute the Meta family, so any number of Meta assets count once for provider independence. Engagement and audience attributes never contribute trust.
Provider families include X, LinkedIn, and Meta for Threads, Instagram, and Facebook. Multiple assets in one family count once. Threads does not inherit verification from another Meta asset. Popularity and engagement never contribute trust.

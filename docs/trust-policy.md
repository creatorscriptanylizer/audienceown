# Trust policy: `identity-trust-v1`

Trust is deterministic and explainable. Authoritative, fresh provider ownership and verified domains contribute positive evidence. Official, primary, domain, and verified replacement identities are strong signals; other authoritative provider verification is valid. Duplicates with the same provider family and stable identity are not independent.

Explicit rules override score thresholds:

- Any revoked or conflicting authoritative identity produces `restricted` and suppresses public verified badges.
- Fresh positive evidence plus a stale or unavailable important signal produces `needs_attention`.
- At least two strong, fresh, independent provider families produce `strongly_verified`.
- At least one authoritative fresh signal produces `verified`.
- Pending or weak evidence produces `partially_verified`; no meaningful evidence produces `unverified`.

Recommendations are evaluation-scoped and idempotent. They point to concrete actions: verify a primary account or domain, refresh stale evidence, reconnect a provider, add an independent family, or keep revoked identities archived. Resolved recommendations remain in creator-visible history.

The internal score and signal weights aid deterministic policy implementation and operations only. They are absent from public RPCs, APIs, and UI because a raw number would conceal evidence quality, independence, blockers, and freshness.

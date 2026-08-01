# Creator identity graph

Continuity statements derive only from this graph's authoritative relationships and revisions.

Stage 7.0 consumes this graph through the safe public authenticity serializer; authenticity profiles control presentation only and are not a second identity model.

Stage 6.1 adds a monotonic `identity_revision`. Account, domain, and relationship mutations advance it and invalidate cached trust without creating a parallel identity model. See [Explainable identity trust](./identity-trust-engine.md).

Stage 6.2 adds normalized observations around this same graph. Stable-ID mismatches never overwrite an existing identity; safe handle, name, and URL changes preserve it.

Stage 6.0 adds one normalized identity profile per creator. Accounts are keyed by creator, provider, and stable provider account ID. Handles, names, and canonical URLs are mutable display metadata; changing them updates the existing identity and appends an event. A stable-ID change is treated as a different identity and the prior record is marked for attention or revoked.

The graph projects authoritative `connected_accounts`, provider identity fetchers, verified emergency replacements, and verified domains. It never stores OAuth credentials, provider responses, challenge material, or verification evidence. Multiple accounts per provider are allowed, but only one verified account may be primary. Only verified, current identities may be official or public.

Directional relationships preserve replacements and migrations, including `emergency_replacement_for`. Events are append-only. Stage 6.0 deliberately exposes no trust score; scoring belongs to Stage 6.1.

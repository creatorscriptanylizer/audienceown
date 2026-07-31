# Emergency account verification

Stage 5.2 binds a prepared replacement to an authoritative provider, stable provider account ID, canonical HTTPS URL, display handle, creator, method, and verification timestamp. Handles are display metadata and never ownership proof.

Supported methods are `provider_oauth`, `existing_connected_account`, `provider_api`, `profile_challenge`, `domain_challenge`, and privileged `manual_review`. Provider OAuth, connected-account identity, and provider API verification are high confidence. Profile challenges are medium confidence. Manual review is medium at most and cannot be self-approved. Domain verification proves control of a recovery domain, not ownership of an unrelated social account.

Provider support is capability-driven. YouTube channels, Meta professional identities and Pages, TikTok Login Kit identity, X account IDs, Twitch broadcaster IDs, and other providers use the existing adapter identity fetcher only when scopes and app review permit. Discord verifies guild/channel authority. Unsupported methods return a capability, review, or scope blocker and never fall back silently.

Challenges are random, hashed at rest, expire quickly, have bounded attempts, and are tied to one replacement. Profile content is checked only through official APIs. Domain checks require HTTPS/DNS exact matches, public IPs, bounded bodies and timeouts, and reject unsafe redirects.

Verified connected accounts are revalidated daily by default. Active critical destinations should be scheduled every 15–60 minutes. Stable-ID matches preserve verification and safely refresh handle/URL metadata. A stable-ID change or lost grant revokes verification, invalidates approval, appends history, and removes the public badge.
# Identity graph integration

Successful emergency replacement verification can be projected into the creator identity graph. The verification remains authoritative; the graph stores only normalized identity and a directional `emergency_replacement_for` relationship.

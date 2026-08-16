# Creator identity graph

The command dashboard exposes only safe aggregate identity state and verified-account count, never stable provider identifiers.

Stage 8 ecosystem destinations are projections attached through verified accounts, domains, or creator identity. Stable provider IDs preserve continuity; ecosystem records never duplicate social accounts already represented here.

Continuity statements derive only from this graph's authoritative relationships and revisions.

Stage 7.0 consumes this graph through the safe public authenticity serializer; authenticity profiles control presentation only and are not a second identity model.

Stage 6.1 adds a monotonic `identity_revision`. Account, domain, and relationship mutations advance it and invalidate cached trust without creating a parallel identity model. See [Explainable identity trust](./identity-trust-engine.md).

Stage 6.2 adds normalized observations around this same graph. Stable-ID mismatches never overwrite an existing identity; safe handle, name, and URL changes preserve it.

Stage 6.0 adds one normalized identity profile per creator. Accounts are keyed by creator, provider, and stable provider account ID. Handles, names, and canonical URLs are mutable display metadata; changing them updates the existing identity and appends an event. A stable-ID change is treated as a different identity and the prior record is marked for attention or revoked.

The graph projects authoritative `connected_accounts`, provider identity fetchers, verified emergency replacements, and verified domains. It never stores OAuth credentials, provider responses, challenge material, or verification evidence. Multiple accounts per provider are allowed, but only one verified account may be primary. Only verified, current identities may be official or public.

Directional relationships preserve replacements and migrations, including `emergency_replacement_for`. Events are append-only. Stage 6.0 deliberately exposes no trust score; scoring belongs to Stage 6.1.
TikTok `open_id`, Instagram professional account ID, and Facebook Page ID are private stable anchors. Meta app users are discovery principals, not creator assets. Safe public projections contain only category, label/handle, canonical URL, official state, and verification time.
Stage 8.4 anchors X by numeric user ID and LinkedIn by member or organization identity. Usernames and vanity identifiers remain mutable labels. Private centralized IDs stay out of public serializers.
# Expansion IV identities

Spotify account, Snapchat Login Kit, Snapchat Public Profile, Pinterest account/board, and manual-service relationships remain distinct nodes. Mutable handles never replace stable anchors, and manual services contribute strong coverage only with authoritative evidence.

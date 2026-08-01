# Authenticity manifest

Ecosystem discovery has a separate `audienceown-ecosystem-v1` projection linked from public authenticity. It follows the same revision and suppression policy as the canonical manifest.

`audienceown-manifest-v1` is available at `/api/public/creators/:slug/manifest` and `/verify/:slug/manifest.json`. It is canonical JSON derived from the Stage 7.0 serializer and contains only public creator, state, account, domain, relationship, emergency, assertion, continuity, and feed links. It contains no database IDs, stable provider IDs, source IDs, scores, weights, evidence, incidents, or alerts.
The existing assertion semantics accept optional safe provider entries, so Stage 8.3 retains assertion compatibility. Entries omit stable asset IDs, app-scoped IDs, permissions, access level, review state, operational metadata, and credentials.
Stage 8.4 reuses the compatible assertion schema. Safe provider entries omit centralized stable IDs and operational metadata; internal database IDs never appear.
# Expansion IV compatibility

Existing optional account/destination fields represent Stage 8.5 without changing assertion semantics. Safe provider/service labels and canonical public URLs may be signed; stable IDs, scopes, tokens, product reviews, challenges, and evidence are excluded. Previous assertion versions remain verifiable.

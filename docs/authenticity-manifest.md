# Authenticity manifest

Ecosystem discovery has a separate `audienceown-ecosystem-v1` projection linked from public authenticity. It follows the same revision and suppression policy as the canonical manifest.

`audienceown-manifest-v1` is available at `/api/public/creators/:slug/manifest` and `/verify/:slug/manifest.json`. It is canonical JSON derived from the Stage 7.0 serializer and contains only public creator, state, account, domain, relationship, emergency, assertion, continuity, and feed links. It contains no database IDs, stable provider IDs, source IDs, scores, weights, evidence, incidents, or alerts.

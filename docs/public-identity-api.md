# Public identity API

`GET /api/public/creators/:slug/identity` returns a deterministic, cacheable graph for public creator pages. It includes display names, providers, safe HTTPS destinations, account kinds, official and primary flags, safe verification timestamps, verified domains, and active safe replacement/migration relationships.

The response excludes creator internal IDs, source connection and replacement IDs, stable IDs, metadata, confidence reasoning, evidence, reviewers, hashes, provider errors, team records, and OAuth information. Hidden creators return 404. Revoked, archived, unverified, and non-public identities are omitted.

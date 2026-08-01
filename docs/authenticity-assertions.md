# Authenticity assertions

Assertions use version `audienceown-authenticity-v1` and Ed25519 (`alg: EdDSA`). The response contains `payload`, a protected header (`alg`, `kid`, `typ`), and a base64url signature. The signature input is base64url of canonical protected JSON, a period, and base64url of canonical payload JSON. Canonical JSON recursively sorts object keys.

Payloads contain issuer, public slug subject, public audience, issue/expiry times, identity and presentation revisions, public trust state, safe accounts/domains/relationships, and safe emergency data. Stable provider IDs, source IDs, evidence, scores, weights, private metadata, and monitoring data are prohibited.

`lib/authenticity/verify-assertion.ts` validates format, version, configured issuer, time bounds, matching key ID, and signature. Callers must obtain keys only from the AudienceOwn well-known endpoint; assertion payloads never nominate a key URL. Revoked, superseded, expired, or revoked-key assertions are not returned as current.

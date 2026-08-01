# Account verification API

Use `/api/public/authenticity/lookup?url=HTTPS_URL`; provider-scoped `provider` plus `handle` is also supported. URL matching normalizes HTTPS host/path and compares exactly. Provider hosts use an allowlist. Display names and fuzzy matching are never used. Ambiguous, hidden, restricted, revoked, archived, and unverified records do not become official.

`/api/public/authenticity/lookup/assertion?url=...` returns a short-lived `audienceown-account-status-v1` Ed25519 response using the existing key system, or a clear unsigned-unavailable response.

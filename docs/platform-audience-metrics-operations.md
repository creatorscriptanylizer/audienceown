# Platform audience metric operations

Schedule `POST /api/internal/providers/audience-metrics/sync` with `Authorization: Bearer $PROVIDER_AUDIENCE_METRICS_WORKER_SECRET`. Use 6–24 hour cadence; provider minimum intervals and exponential retry spacing are enforced by the worker. `PROVIDER_AUDIENCE_METRICS_BATCH_SIZE` defaults to 20 and is capped at 100.

`GET /api/internal/providers/audience-metrics/health` reports due/stale rows, access blockers, failures, stale leases, and the oldest success. `GET /api/analytics/providers/audience-metrics` returns only the signed-in creator's normalized aggregate rows.

Troubleshooting uses normalized codes only: `authorization_revoked`, `provider_access_denied`, `provider_rate_limited`, `invalid_provider_response`, `selected_asset_unavailable`, and `provider_unavailable`. Never log tokens, stable IDs, or provider payloads. Live checks must use only the creator's accounts; absence of credentials is readiness validation, not a successful live API check.

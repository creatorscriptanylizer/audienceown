# Identity monitoring operations

Call `POST /api/internal/identity/monitor` with the exact worker bearer secret. Work is bounded, leased with stale-lease recovery, and scheduled by identity importance and retry state. Provider adapters and encrypted connection-secret access are reused; unsupported webhook providers remain polling-only. There is no scraping and no claim that all providers expose lifecycle webhooks.

`GET /api/internal/identity/monitoring/health` returns aggregate due counts, pending observations, incident severities, stale leases, provider failures, queued trust work, private-alert counts, prepared drafts, and last monitoring activity. It excludes provider errors, account destinations, fingerprints, and observation metadata.

Creator APIs expose only creator-scoped incidents, immutable actions, and private alerts. Mutations use same-origin checks, bounded rate limits, and RPC authorization. Critical incidents and alerts cannot be dismissed. Operator intervention must use audited action records; direct table mutation is not a supported workflow.

Troubleshooting starts with worker authentication, due/lease counts, provider capability availability, and normalized observation status. Reprocessing preserves the original observation and appends an action rather than rewriting history.

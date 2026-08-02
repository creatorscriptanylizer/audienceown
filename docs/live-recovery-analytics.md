# Live Recovery Analytics

The canonical live panel is at `/dashboard/analytics/recovery`. It selects the active incident first, supports explicit historical incident selection, and never combines incidents. Active incidents refresh every 12 seconds, pause in hidden tabs, refresh on visibility, abort obsolete requests, back off after failures, and retain the last successful snapshot. Data older than 45 seconds is marked stale.

The creator-authenticated endpoint is `GET /api/analytics/recovery/incidents/:id/live`. It is private/no-store and returns one bounded, creator-scoped aggregate RPC result. Resolved and cancelled incidents remain queryable. The response contains no recipient rows, delivery addresses, raw provider events, visitor identifiers, or provider account IDs.

Stage 8.6 does not add an export because the existing recovery analytics subsystem has no export surface. Operators should verify that an incident owns a recovery update and that deliveries have left `queued` when targeted counts exist but sent counts do not.

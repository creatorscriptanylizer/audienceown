# Platform audience metrics

Stage 8.8 stores only authoritative aggregate counts for the 12 approved platforms. `provider_audience_metrics` contains the latest normalized integer or `null`; `provider_audience_metric_snapshots` contains at most one available observation per selected asset and day. No follower record, identity, list, handle, contact detail, token, or raw provider response is stored.

The server-only worker claims bounded rows with leases, loads existing encrypted credentials, preserves the connected-account or selected-asset boundary, validates JSON at runtime, and writes a safe status code. Normal polling is 6–24 hours according to the central capability registry. Missing worker configuration disables synchronization without preventing app startup.

Growth is `(current - comparison) / comparison`, calculated in PostgreSQL. A zero comparison yields `null`. Trends require at least three observations on two dates; the client never creates points.

# X API readiness

`X_API_ACCESS_TIER` defaults to `unavailable`. Credentials alone never enable detection. Readiness combines OAuth configuration, requested and granted scopes, plan entitlement, token health, and rate-limit state. `X_STREAM_ENABLED` is effective only for an explicitly stream-entitled tier; otherwise polling and manual import remain available.

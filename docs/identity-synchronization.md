# Identity synchronization

Sync outcomes advance the identity revision. The trust worker evaluates only changed or expired profiles; provider sync never writes a trust state directly.

The internal identity worker claims bounded, due accounts with leases and uses the existing social adapter registry, encrypted connection secrets, refresh behavior, and provider identity fetchers. Matching stable IDs preserve verification while safely updating handles and canonical URLs. A changed stable ID marks the old identity `needs_attention`; revoked grants revoke the identity and remove official, primary, and public presentation.

Schedule `POST /api/internal/identity/sync` with `IDENTITY_SYNC_WORKER_SECRET`. `IDENTITY_SYNC_BATCH_SIZE` bounds work, while `IDENTITY_SYNC_REVALIDATION_HOURS` and `IDENTITY_SYNC_MAX_ATTEMPTS` provide optional operational defaults. Missing credentials affect only that provider. Health is available at `GET /api/internal/identity/health` with the same secret.

Migration backfill creates profiles for existing creators and accounts only where an authoritative stable provider ID and current verified connection or emergency verification exist. It never guesses IDs or fabricates timestamps.

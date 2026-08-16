# YouTube authorization and data lifecycle

AudienceOwn requests only `youtube.readonly`. The OAuth callback binds the signed state to the current user and creator and rejects unexpected granted scopes.

The social worker is intended to run every 5–10 minutes (`SOCIAL_POLL_INTERVAL_MINUTES`). Successful synchronization updates connection health, public subscriber metrics, and public upload checkpoints. Each refresh checks authorization implicitly through Google token refresh. An invalid or revoked grant must stop retries, disable polling, mark the connection revoked, and trigger authorized-data cleanup. Temporary provider failures use bounded server-side retry behavior.

Disconnect disables access before revocation. Successful or already-completed Google revocation deletes tokens, scopes, expiration state, channel authorization binding, subscriber metrics and snapshots, upload detections, polling state, and provider health. A Google outage leaves an honest revocation-pending state: polling is disabled and credentials remain encrypted only so a server-side retry can revoke them. Browser clients never receive tokens.

A creator-entered YouTube URL may remain only when the creator explicitly selects **keep manual recovery destination**. It is stripped of OAuth metadata and labeled **Manually added**. Removing the account deletes that fallback too. Neither action deletes YouTube-hosted content.

Production operations must schedule and monitor authorization/revocation retries and confirm the refresh/deletion cadence against the current YouTube API Services policies before launch.

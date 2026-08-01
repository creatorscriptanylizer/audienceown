# Ecosystem automation operations

The worker and health endpoints require `ECOSYSTEM_AUTOMATION_WORKER_SECRET`. Claims use bounded `FOR UPDATE SKIP LOCKED` leases and recover expiry. Creators may pause, resume, retry, select priority, and control safe metadata auto-apply. They cannot alter stable IDs, authority policy, verification state, trust weights, or signature rules. Incident resolution requires current authoritative verification.

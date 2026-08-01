# Meta webhooks

`/api/webhooks/providers/meta` supports the GET subscription challenge and verifies POST bodies with `X-Hub-Signature-256`. It enforces JSON content, 256 KB bodies, a narrow object/field schema, selected-asset binding, a ten-minute replay window, and receipt deduplication.

Webhook payloads are not persisted. Accepted lifecycle/media signals only move the selected source's next reconciliation time forward. `/api/internal/providers/meta/reconcile-webhooks` then schedules authoritative Graph polling. Webhooks never directly verify an asset or create a draft.

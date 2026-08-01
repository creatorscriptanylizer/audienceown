# Ecosystem provider webhooks

`POST /api/webhooks/ecosystem/[provider]` is capability gated. GitHub uses `X-Hub-Signature-256`, numeric IDs, and delivery-ID deduplication. Unsupported events are safely acknowledged. Raw payloads and signatures are not stored; handlers ingest normalized observations and policy processing owns public mutations. Missing secrets disable only that webhook while fallback polling remains available.

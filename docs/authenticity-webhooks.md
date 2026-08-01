# Authenticity webhooks

Authenticated creators register HTTPS server endpoints through `/api/developer/authenticity/subscriptions`. DNS and destination IPs are checked against private, loopback, link-local, reserved, and metadata ranges. Redirects are rejected. Endpoint ownership uses a short-lived challenge. Secrets are encrypted, shown only at creation/rotation, and excluded from reads.

Deliveries use event ID, timestamp, and HMAC-SHA256 headers over `eventId.timestamp.canonicalBody`. Consumers should reject timestamps outside five minutes and deduplicate event IDs. Retries are exponential and bounded.

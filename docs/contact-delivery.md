# Contact delivery contract

`POST /api/contact` accepts `multipart/form-data`. It is a public endpoint protected by an explicit Origin allowlist, strict server validation, a hidden honeypot, and the existing five-submissions-per-15-minutes per-instance rate limit. Attachments consume the same quota. A shared/distributed limiter remains a production infrastructure follow-up for multi-instance deployments.

## Intake and routing

The stable topics routed to `support@audienceown.com` are Account & sign-in, Creator profile / public page, Recovery Pass, Recovery destinations, Audience & preferences, Platforms & connected accounts, Updates & notifications, Identity & authenticity, Ecosystem, Emergency Mode, Recovery Analytics, and Billing & plan. Privacy request, Security or abuse report, Partnership / business inquiry, and Other route to `contact@audienceown.com`. Destination selection is server-only and unknown fields are rejected.

Optional server-validated context includes a topic-specific subtype/platform, product area, urgency for account access/emergency/security topics, an AudienceOwn-owned HTTPS page URL, and AudienceOwn handle. Privacy requests warn that later verification may be required. Account and security flows warn against submitting secrets.

The sender is always `AudienceOwn <contact@mail.audienceown.com>` and Reply-To is the normalized visitor email. Subjects use `[AudienceOwn Support]`, `[AudienceOwn Privacy]`, or `[AudienceOwn Security]`, followed by the subtype/topic and bounded visitor subject. The plain-text body contains only supplied triage fields, message, page URL, attachment filenames, and ISO submission time. It does not include an IP address.

## Attachments

Up to three PNG, JPEG, or WEBP screenshots are accepted, with a maximum of 5 MB per image and 10 MB total. The route rejects an oversized declared request early (413) and enforces actual parsed file count and byte limits (400). Validation requires agreement among declared MIME, safe extension, and binary signature (magic bytes); zero-byte, SVG, HTML, PDF, archive, executable, and unknown data are rejected. Filenames are bounded and stripped of path/control characters. Image bytes and filenames are never logged, and no OCR or content inspection is performed.

Validated images are held in memory only for one bounded Resend request and sent as direct attachments. AudienceOwn application storage does not persist the message, email address, or screenshots; no Supabase bucket, database table, migration, public URL, or signed URL is involved. The application makes no claim beyond its own non-persistence about provider retention. A provider attachment rejection is 503.

## Status, security, and operations

Origin validation runs before multipart parsing. Trusted production origins are `https://audienceown.com` and `https://dev.audienceown.com`; non-production also trusts the two configured loopback origins. Host and forwarded headers do not expand trust. Honeypot submissions call no provider and return the normal success shape. Header fields reject CR/LF characters. Contact code must never log form values, file bytes, credentials, authorization data, IP addresses, or provider payloads.

Every response is `Cache-Control: no-store`: 200 means Resend returned an acceptance ID, 400 means invalid form or attachment, 403 means rejected Origin, 413 means declared request too large, 429 means rate limited, and 503 means missing configuration or provider/transport failure. Resend receives exactly one attempt with a 10-second abort signal and no automatic retry.

Production requires server-only `RESEND_API_KEY` and `DELIVERY_EMAIL_FROM=AudienceOwn <contact@mail.audienceown.com>`. `RESEND_FROM_EMAIL` remains a legacy fallback only when the canonical variable is absent. Operational follow-ups are distributed abuse controls for multi-instance traffic, continued `mail.audienceown.com` verification, active Cloudflare routing for both inboxes, and optional delivery/bounce webhook observability.

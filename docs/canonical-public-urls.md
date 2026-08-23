# Canonical public URL contract

AudienceOwn share assets are permanent public identifiers. Their origin always comes from the canonical public-origin configuration and is `https://audienceown.com` in every environment.

- Verification links, copied links, QR payloads, downloaded QR assets, embeds, lookups, and Recovery Pass links use the canonical origin.
- Local and staging navigation may use relative routes such as `/verify/{slug}` so creators can preview the current deployment.
- Share URLs never use `window.location`, the current browser origin, request `Host` or `X-Forwarded-Host` headers, Vercel preview/deployment domains, localhost, `127.0.0.1`, arbitrary request origins, or internal service URLs.
- In production, any configured `AUTHENTICITY_PUBLIC_BASE_URL`, `PUBLIC_APP_URL`, or `APP_URL` must be exactly `https://audienceown.com`; an insecure or staging value produces a clear configuration error. If no value is configured, the explicit product canonical origin is still used and never falls back to localhost.

This invariant covers verification links, Recovery Pass links, copied public links, QR payloads and downloads, embeds, public lookup responses, manifests, assertions, continuity documents, and webhook links. Tests protecting it must not be removed or weakened without an intentional change to this contract.

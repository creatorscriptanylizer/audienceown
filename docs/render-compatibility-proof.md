# Disposable Render compatibility proof

This proof uses only a temporary `onrender.com` hostname. Do not attach `audienceown.com`, change Cloudflare, enable schedulers, or apply database migrations.

## Service configuration

- Service type: paid Node Web Service
- Region: Frankfurt
- Branch: an explicitly approved proof branch or commit containing the proof harness
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Health check path: `/api/health`
- Node version: `22`

Next.js `next start` reads Render's `PORT` automatically and listens on `0.0.0.0`; no custom server is required.

## Minimum environment

Boot and public route proof:

- `NODE_VERSION=22`
- `APP_URL=https://audienceown.com`
- `NEXT_PUBLIC_APP_URL=https://audienceown.com`
- `NEXT_PUBLIC_SUPABASE_URL` with a test/staging or safely read-only target
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for that same target

Multipart proof:

- `RENDER_MULTIPART_PROOF_ENABLED=true`
- `RENDER_MULTIPART_PROOF_SECRET` generated specifically for this disposable service

Do not configure `RESEND_API_KEY`, provider secrets, production worker secrets, schedulers, or production Supabase administrator credentials for the ingress proof.

## Run the acceptance gate

From a trusted workstation, run:

```sh
RENDER_MULTIPART_PROOF_SECRET='<proof-only secret>' node scripts/render-compatibility-proof.mjs https://<service>.onrender.com
```

The runner refuses `audienceown.com` and its subdomains. It checks public routes, auth redirect behavior, 1 MB, 5 MB, and 10 MB valid image payloads, then confirms a request above the 10.5 MB envelope reaches application code and receives an application-marked 413.

An ingress result passes only when the response contains `x-audienceown-proof-reached: application`. A proxy-generated 413 or response without that marker fails the Render gate.

## Contact and external integration proof

The diagnostic endpoint does not call Resend or persist data. Existing focused tests mock contact delivery and cover provider success/failure, invalid attachments, and origin rejection. Live Resend, OAuth, webhook, and Supabase write tests are intentionally outside this disposable ingress proof.

Webhook reachability can be checked with existing invalid-signature fixtures. Do not send live provider webhooks. Keep all worker schedules disabled.

## Cleanup

After recording results:

1. Set `RENDER_MULTIPART_PROOF_ENABLED=false` or delete the disposable service.
2. Delete its proof secret.
3. Confirm no custom domain was attached.
4. Leave Cloudflare DNS and the existing tunnel untouched.

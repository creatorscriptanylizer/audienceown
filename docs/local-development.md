# Local development

Run `npx supabase start`, `npx supabase db reset`, and `npm run local:check`, then start Next.js with `npm run dev`. The local project is `ownsignal`; its API is `http://127.0.0.1:54321` and the app is `http://localhost:3000`.

Next.js loads `.env.development.local` before `.env.local` in development. Supabase CLI `env(...)` substitutions load the root `.env`; shell environment variables also work. All `.env*` files except `.env.example` are ignored. Keep the local URL, publishable key, and server-only service-role key in ignored files. Never prefix service-role or OAuth secrets with `NEXT_PUBLIC_`.

Contact fixtures and runtime delivery must use the same ignored local `CONTACT_ENCRYPTION_KEY` (minimum 20 characters). The Stage 8.8 seed fails before writing contacts when it is absent or too short. Existing sentinel or unknown-key local fixture rows must be replaced by resetting and rerunning the local seed; never guess a hosted key or add a plaintext fallback.

Use values printed by `npx supabase status -o env` to configure the ignored Next.js files. Do not copy keys or tokens from a hosted project. `npm run local:check` reports URLs and booleans only; it never prints keys or tokens.

For Google sign-in, use a Google OAuth client dedicated to local development. Its authorized redirect URI is the local Supabase Auth callback, `http://127.0.0.1:54321/auth/v1/callback`; this is separate from the AudienceOwn application callback, `https://audienceown.com/auth/callback`. Put that client's ID and secret in ignored local environment configuration as `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET`. Do not register wildcard or LAN-address redirects.

The hosted Google client must instead register the hosted Supabase Auth callback, `https://jngmxlcibqmtrvskxdcw.supabase.co/auth/v1/callback`. Hosted Supabase's redirect allowlist should contain the exact production application callback `https://audienceown.com/auth/callback`. Local Supabase uses that same exact application callback while retaining the local Supabase Auth provider callback above.

Use `https://audienceown.com` as the normal browser origin for authentication, dashboard work, creator workflows, Recovery Pass, and provider connections. Cloudflare routes that canonical origin to the local Next.js server, which continues to use local Supabase. Direct loopback `/login` requests redirect to the canonical login before PKCE begins; localhost remains available only for unauthenticated diagnostics and UI inspection. Do not add a localhost AudienceOwn callback or copy session cookies between origins.

If queries mention missing Stage 8.8 columns, confirm `NEXT_PUBLIC_SUPABASE_URL` is local, stop stale Next.js processes, run `npx supabase db reset`, and restart Next.js.

## Frontend asset freshness

The normal UI workflow is:

1. Run `npm run dev` (Next.js 16 uses Turbopack by default).
2. Open the route you are changing so Next.js compiles it.
3. Save the source file. Fast Refresh should update the browser without a hard refresh.

Next.js 16 keeps development output in `.next/dev` and production output in `.next/static`, so `next dev` and `next build` do not reuse the same compiled CSS directory. `app/globals.css` is imported only by `app/layout.tsx`. Dashboard-only `components/dashboard/creator-command-dashboard.css` is imported only by its dashboard component.

If the dev server appears stale, run `npm run diagnose:frontend-cache` while it is running. The command reports the installed Next.js version, bundler setup, a non-sensitive source fingerprint, CSS import ownership, generated CSS files and contract values, service-worker caching capability, and reachable local response cache headers. It discovers CSS files dynamically and does not depend on hashed filenames. Use `FRONTEND_CACHE_URL=http://localhost:PORT npm run diagnose:frontend-cache` for a non-default port.

If the diagnostic confirms generated development output is stale, stop the current server and run `npm run dev:clean`. This removes only `.next/dev`, preserves production build output, and starts the default Turbopack dev server. It never removes dependencies, environment files, source, Supabase data, or user files.

For a bundler comparison, stop the current server and run `npm run dev:webpack`. Next.js 16.2.11 officially supports `next dev --webpack`; this is diagnostic only and does not change the default bundler.

`public/service-worker.js` supports opt-in web push. It is not registered during ordinary page loading and defines no `fetch` listener or Cache Storage usage, so it does not cache localhost HTML, JavaScript, or CSS. A previously granted push registration therefore is not an application-asset cache.

A hard refresh, disabled browser cache, or cleared site data is a last diagnostic step, not routine development workflow.

## Production caching

Production users must not be instructed to hard-refresh after normal releases. Next.js emits content-hashed `/_next/static` assets suitable for long-lived immutable caching; newly deployed HTML/RSC must remain fresh enough to reference the new hashes. Authenticated HTML, RSC responses, dashboard routes, and other dynamic responses must never be covered by a Cloudflare "Cache Everything" rule. If production assets appear stale, inspect deployment HTML/RSC and Cloudflare cache rules rather than adding random query parameters or disabling caching globally.

There is no repository-controlled Cloudflare cache configuration in this project. Remote Cloudflare rules must therefore be audited in the Cloudflare account before concluding that the application configuration is responsible.

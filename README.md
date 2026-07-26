# AudienceOwn Stage 1

AudienceOwn tests one question: will creators publish an AudienceOwn page and place its link in their social bios?

## Product surface

- Supabase email/password and Google OAuth authentication, password reset, and TOTP MFA
- One canonical `public.creators` record per `auth.users` identity
- Collision-safe public pages at `/c/[slug]`
- Profile and banner uploads in the public `creator-media` bucket, with owner-path Storage RLS
- Official and backup accounts through `public.connected_accounts`
- One current manual public announcement; no broadcast, scheduling, tracking, queue, or delivery infrastructure
- Encrypted subscriber contacts through the canonical follower tables
- Token-based `/preferences/[token]` and `/unsubscribe/[token]` routes
- Creator-owned audience dashboard and trusted server-side CSV export

## Environment

Copy the Supabase project values into `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=
CONTACT_ENCRYPTION_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` and `CONTACT_ENCRYPTION_KEY` are server-only. Never prefix them with `NEXT_PUBLIC_`.

Apply [the Stage 1 migration](supabase/migrations/20260724000000_stage_one.sql), deploy the `subscribe`, `preferences`, and `unsubscribe` Edge Functions, and set `CONTACT_ENCRYPTION_KEY` in both the application and Edge Function environments. Media uses explicit public URLs; contact values remain encrypted and have no browser-readable policy.

## Verification

```bash
npm run check
npm run build
```

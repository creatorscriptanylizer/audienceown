# Local authentication

Email/password is the always-available, real Supabase Auth fallback. Local email confirmation is disabled so a developer can use the documented Stage 8.8 fixture login. This does not bypass Auth, forge a cookie/JWT, use service-role credentials in the browser, or alter production authentication.

Google is disabled in the committed `supabase/config.toml`, allowing the stack to start without secrets. To enable it locally, put these values in the ignored root `.env`, change only your local provider block to `enabled = true`, and restart Supabase:

```text
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=
```

Google Cloud configuration:

- Authorized redirect URI: `http://127.0.0.1:54321/auth/v1/callback`
- Authorized JavaScript origins: `http://localhost:3000` and `http://127.0.0.1:3000`

The app offers Google for hosted environments, and locally only when both server-only credential variables are present. A disabled-provider response is mapped to “Google sign-in is not configured for this local environment.” The callback exchanges the authorization code using Supabase, preserves safe relative `next` paths, rejects external redirects, and returns failures to a safe login state.

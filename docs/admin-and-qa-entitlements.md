# Admin and QA entitlements

AudienceOwn application admins are stored in `public.app_admins`. The authority key is `auth.users.id`; the optional email column is audit/display metadata only. Creators map to Auth through `creators.owner_user_id`. There is no `ADMIN_EMAIL`, `NEXT_PUBLIC_IS_ADMIN`, browser cookie, or local-storage authority.

The tables use forced RLS and grant no privileges to `anon` or `authenticated`. Only the server service-role operator can grant or revoke records. The account Settings page resolves the role server-side and shows a subtle “AudienceOwn Admin” indicator.

## Operator commands

Run against local Supabase after the user has signed in:

```sh
npm run admin:grant -- --email=enkiakka@gmail.com
npm run admin:check -- --email=enkiakka@gmail.com
npm run admin:revoke -- --email=enkiakka@gmail.com
npm run qa:grant-pro -- --email=enkiakka@gmail.com
npm run qa:revoke-pro -- --email=enkiakka@gmail.com
```

Email is used only to resolve exactly one Auth user before storing its UUID. An absent or ambiguous match makes the command fail without mutation. No `.env.local` admin identity or plan flag is required.

## QA Pro boundary

`public.qa_entitlement_overrides` is explicit, reversible test state. It does not create Stripe objects, webhook events, subscriptions, or billing projection rows. Central provider entitlement resolution uses it only when the creator owner is an app admin and the database request host is loopback. The CLI separately requires non-production `NODE_ENV` and a loopback Supabase URL. A hosted Supabase project therefore ignores QA rows and the command refuses to write them.

Admin and Pro remain separate. In production, admin alone receives Free limits; active/trialing trusted billing Pro remains unlimited, while delinquent/inactive states fall back to Free. Locally, the explicit QA override grants unlimited official and backup slots only to its admin creator.

## Provider QA workflow

Start/reset local Supabase, sign in as the target account, run the admin grant and QA Pro grant, then run `npm run provider:config-check`. In Configure accounts, connected providers remain Connected; configured providers show Connect (or App review required · Connect); missing credentials show Setup required. OAuth routes and scopes are unchanged. Revoke QA Pro after testing.

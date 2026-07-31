# Emergency operations

Monitor active incidents, their canonical `creator_update_id`, `update_deliveries`, and append-only `emergency_events`. Activation is synchronous through
`POST /api/emergencies/:id/activate`: the lifecycle RPC creates the snapshot and update, then the existing Recovery Pass delivery resolver queues recipients.

Critical activation requires a JWT `reauthenticated_at` claim no older than 15 minutes. Production authentication must populate this claim after a verified
reauthentication challenge. Team approvers need `emergency_approve`; activators need `emergency_activate`; incident operators need `emergency_manage`.

If delivery preparation fails, the incident and immutable snapshot remain active and the canonical update remains available for an authorized retry through
existing delivery operations. Do not alter snapshots or audit events. Resolve an incident only after the public warning is no longer required.

Local verification:

```sh
npx supabase db reset
npx supabase test db
npm run db:types
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
```


# Local Stage 8.8 fixtures

After a local database reset, run `npm run local:seed-stage-8-8`. The command exits unless the Supabase hostname is `localhost` or `127.0.0.1`, a server-only local service-role key is available, and `CONTACT_ENCRYPTION_KEY` is configured with at least 20 characters in the local environment loaded by both Next.js and the seed command.

Sign in at `/login?next=/dashboard` with `stage88@audienceown.local` and password `LocalStage88!`. This documented local-only credential creates a normal Supabase Auth session.

The idempotent fixture replaces only that local creator and creates:

- official, verified Main YouTube with 125,000 fixture subscribers;
- verified TikTok backup with 18,400 fixture followers;
- a second verified YouTube backup with 4,200 fixture subscribers;
- three synthetic `.invalid` email destinations encrypted with the configured local contact key;
- verified local recovery methods, Videos preferences, and Main-account memberships for those fixture fans;
- Fan A selecting both backups, Fan B selecting TikTok, and Fan C selecting YouTube backup.

Expected results are 3 deduplicated protected fans, 2 fans and 66.7% coverage per backup destination. Percentages overlap by design. Values marked `development_fixture` are stored fixture observations, not live API synchronization. The script stores no provider tokens, raw responses, real contacts, follower identities, or production data.

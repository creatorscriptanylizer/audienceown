# Recovery destination opt-ins

An opted-in protected fan is a unique active AudienceOwn audience relationship with an active selection for a usable, creator-owned, verified recovery destination. Opted-out, suppressed, invalid, revoked, archived, test, preview, and admin activity is excluded.

Protected Audience deduplicates each fan across every selected destination using the stable AudienceOwn contact identity. Recovery Connections count distinct active destination preferences, so one fan selecting three destinations produces one protected fan and three connections. Destination totals deduplicate within that destination, but the same fan may count once for several destinations. Database uniqueness on `(follower_connection_id, logical destination)` prevents retries or repeated interactions from inflating the count.

These aggregates are AudienceOwn data. They are never labeled as followers or subscribers and contain no fan identity or contact details.

Provider-native counts remain separate context. For example, a backup Instagram account with 8,000 existing followers and 320 Recovery Pass opt-ins contributes exactly 320—not 8,000 or 8,320—to recovery metrics.

Growth uses only destination preference `selected_at` timestamps and returns cumulative Protected Audience and Recovery Connections for 7-day, 30-day, 90-day, or all-time ranges. Existing rows can reconstruct acquisition timing for retained preferences, but deleted rows and past status transitions cannot be reconstructed because the current schema has no immutable preference event ledger.

## Fan destination selection

An active Recovery Pass participant can select one or more creator-owned recovery destinations from the public creator page. Connected social destinations are resolved directly from durable creator ownership with `account_type = 'backup'`; they do not depend on a current Main account or `protected_official_account_id`. Verified replacement identity accounts and verified public ecosystem/manual destinations use their existing canonical records. Main/Official, archived, revoked, private, or unverified records are not offered.

Selection proves AudienceOwn recovery opt-in intent only. It does not prove that the fan completed a native platform follow, subscription, or Discord join. Selecting creates or reactivates the canonical `follower_recovery_destination_preferences` row. Repeated requests are idempotent through the per-connection destination uniqueness indexes. Destination removal changes the row to `opted_out`; full Recovery Pass deactivation changes the parent follower connection to `unsubscribed`, so both immediately stop contributing to active metrics without deleting preference history.

The public mutation is scoped by the existing private Recovery Pass preference token, active token lifetime, creator slug, follower connection, and server-side destination eligibility checks. The browser never receives service-role credentials. Consequently, Main changes and manual-to-OAuth account unification do not rewrite or duplicate a preference as long as the existing canonical destination ID is preserved.

The current product records selection/opt-in intent. It does not have provider-backed proof that a native follow, subscription, or join completed.

# Dashboard account synchronization

Successful account and metric mutations call the shared creator-account invalidation helper. It revalidates `/dashboard`, `/dashboard/platforms`, the creator-scoped `creator-accounts:<creator-id>` tag, and the `creator-dashboard:<creator-id>` aggregate tag. OAuth completion, disconnect/reconnect, platform actions, role/main-account changes, and audience metric synchronization therefore refresh both surfaces without duplicate setup.

The shared account projection resolves official, backup, emergency replacement, and recovery destination roles per account rather than per provider. Revoked and archived state remains explicit. Audience metrics are separate optional records and cannot determine whether an account is connected.

Both pages call `getCreatorProviderAccounts()`. A healthy/degraded connection remains connected even when no audience metric exists; the dashboard presents this as “Awaiting first subscriber sync” (or the provider-appropriate unit), never “Not connected.”
# Durable creator hierarchy

The creator—not a provider account row—is the durable parent of the account hierarchy. The current Main is the active, intentionally selected (`is_primary`) Official account. Backups are active creator-owned `account_type = 'backup'` rows and are resolved independently of Main.

Deleting, disconnecting, revoking, or replacing Main does not delete, reclassify, or auto-promote Backups. While no active Main exists, the same Backup rows remain available under a “Main account required” state. Selecting a new Main on another provider immediately restores that account as the current context without rewriting Backup IDs or Recovery Pass destination preferences.

`protected_official_account_id` remains an optional same-provider compatibility/presentation link for provider-specific flows; it is not the authoritative ownership relationship. Recovery Pass attribution points to the logical Backup destination itself, so changing Main does not alter opt-in counts or `selected_at` history.

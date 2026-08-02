# Dashboard account synchronization

Successful account and metric mutations call the shared creator-account invalidation helper. It revalidates `/dashboard`, `/dashboard/platforms`, and the creator-scoped `creator-accounts:<creator-id>` cache tag. OAuth completion, disconnect/reconnect, platform actions, and audience metric synchronization therefore refresh both surfaces without duplicate setup.

The shared account projection resolves official, backup, emergency replacement, and recovery destination roles per account rather than per provider. Revoked and archived state remains explicit. Audience metrics are separate optional records and cannot determine whether an account is connected.

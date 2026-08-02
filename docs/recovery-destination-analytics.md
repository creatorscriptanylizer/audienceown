# Recovery destination analytics

`follower_recovery_destination_preferences` extends the existing Recovery Pass relationship with a reference to one canonical connected account, verified identity replacement, or ecosystem destination. It does not duplicate account identity or store fan contact data.

Only active follower connections with active usable preferences contribute. Opted-out or suppressed preferences and revoked or archived verified destinations do not contribute. Aggregate reads are bounded and creator-scoped.

The creator breakdown returns a safe destination ID, provider, presentation name and handle, explicit role, verification state, unique opted-in count, server-calculated coverage, freshness, and an internal management link. It never returns provider stable IDs or fan identities.

Recent opt-ins use anonymous labels such as “New protected fan” and describe either the single safe provider destination or the number of selected destinations. Names, contact details, and external avatars are not loaded.

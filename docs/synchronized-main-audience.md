# Synchronized main audience

The main dashboard and Platforms page consume the same creator-account projection. Connection state is derived from canonical connected accounts, selected provider assets, and identity-account verification; an unavailable audience metric never changes a connected account to disconnected.

Public audience counts are fetched only through approved official provider APIs and stored as aggregate integers. The capability registry records the unit, access requirement, scopes, selected-asset requirement, exactness, and minimum synchronization interval. Unsupported or restricted APIs return an unavailable status without inventing a count.

Accounts remain distinct even when they share a provider. Dashboard output uses an AudienceOwn-safe opaque account key and never exposes provider IDs, connection IDs, asset IDs, credentials, or raw payloads.

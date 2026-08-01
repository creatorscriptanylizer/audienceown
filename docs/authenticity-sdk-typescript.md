# TypeScript authenticity SDK

The SDK at `lib/authenticity-sdk` fetches keys only from the configured AudienceOwn issuer, caches keys, refreshes once for an unknown key, and validates Ed25519, version, issuer, expiry, revoked keys, and signatures. It parses manifests and performs lookup. Unsigned responses are never verified. Payload-controlled key URLs are ignored. Other language SDKs are a future boundary.

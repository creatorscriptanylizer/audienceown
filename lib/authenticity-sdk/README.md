# AudienceOwn TypeScript authenticity SDK

Create `new AudienceOwnAuthenticityClient({ issuer: "https://audienceown.example" })`, then call `verify(envelope)`, `manifest(slug)`, or `lookupAccount(url)`. The client derives the AudienceOwn JWKS path from the configured issuer, refreshes once for unknown keys, accepts only Ed25519 and supported versions, and enforces issuer and expiry. Unsigned data is never treated as verified. Payload-provided issuer or key URLs are never fetched.

Python, Go, and other SDKs are outside Stage 7.1; they can implement the documented canonical JSON and Ed25519 protocol later.

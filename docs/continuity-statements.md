# Continuity statements

`audienceown-continuity-v1` statements are issued only by the internal worker from current authoritative identity relationships. Statement types and reason codes are constrained. Creators cannot submit previous/current URLs. Cross-creator links, self-loops, unverified current accounts, and unsupported relationships are rejected by the service-role storage RPC.

List statements at `/api/public/creators/:slug/continuity`; fetch the signed envelope by its public statement ID. Historical statements expose revoked or superseded status.

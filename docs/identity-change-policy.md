# Identity change policy: `identity-monitoring-v1`

- Handle or display-name changes with the same stable provider ID are informational or low risk and update the existing identity.
- Canonical URL changes are validated as HTTPS and trigger trust review when relevant.
- Stable-ID mismatches are critical. The old stable ID is retained, verified presentation is suppressed, trust is queued, and a private incident is raised.
- Provider revocation is high risk and revokes canonical verification presentation.
- A first transient sync failure remains informational; bounded repeated failures escalate.
- Primary-domain verification loss is high risk; other domain verification loss is medium risk.
- Invalid active emergency replacements are critical, but cannot automatically create follower alerts or activate an emergency.

Only normalized safe metadata keys are accepted. Fingerprints cover stable identity and presentation state but contain no credentials, provider payloads, signatures, or volatile timestamps.

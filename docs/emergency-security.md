# Emergency security boundaries

Public trust never overrides emergency safety. Restricted trust suppresses verified badges while preserving neutral active-emergency guidance; authorization-session and private verification details never enter trust records.

Continuous monitoring never activates emergencies or sends follower alerts. Draft preparation is an explicit creator action and retains every Stage 5 security gate.

- Emergency tables use forced RLS. Owners see only their creator, and team access is derived from explicit permissions.
- A critical incident requester cannot approve their own alert.
- Approval is tied to `content_revision`; edits and replacement changes invalidate prior approval.
- Critical activation requires recent reauthentication.
- Alert snapshots reject updates and deletes. Emergency history rejects updates and deletes.
- Public access is limited to active incidents, affected account display fields, and verified official replacements.
- Stable provider IDs are retained for identity continuity; OAuth tokens and provider credentials are never stored in emergency tables.
- Only HTTPS canonical profile URLs are accepted.
- Activation reuses `creator_updates` and the existing Recovery Pass recipient and transport resolver. AI, team members, and emergency records cannot choose fan
  destinations or transports.
- Broadcast email remains outside Emergency Mode. Email is used here only when it is the fan's verified selected Recovery Pass method.

Review team membership regularly. Treat `manual_review` verification as a privileged operational action and retain evidence outside public alert fields.
## Stage 5.1 preparedness guarantees

Templates, plans, and drills are private creator-scoped data with forced RLS and no anonymous grants. Proposed replacement details are planning data, not verification. Drill results are aggregate-only, cannot enqueue or dispatch provider notifications, cannot make incidents public, and cannot confer approval on a real emergency. Real activation still requires approval of the current content revision, recent reauthentication where required, verified official replacement state, immutable snapshots, and append-only audit history.
# Stage 5.2 verification controls

Replacement ownership now uses stable provider identity through the existing encrypted OAuth connection and adapter registry. Emergency tables never store provider tokens, raw challenges, unrestricted provider responses, or private profile data. Critical redirects require high confidence, a separate approver, single-use authorization, and activation-time policy/hash validation. See [account verification](./emergency-account-verification.md), [authorization](./emergency-authorization.md), and [risk policy](./emergency-risk-policy.md).
# Identity graph boundary

The identity graph is a projection and cannot upgrade emergency verification. Revocation removes official/public identity presentation, while Stage 5 remains authoritative for critical activation and public emergency badges.

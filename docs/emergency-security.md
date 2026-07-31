# Emergency security boundaries

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

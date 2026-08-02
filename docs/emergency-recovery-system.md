# Verified Emergency Mode

Incident delivery outcomes are exposed through the creator-scoped [Live Recovery Analytics](live-recovery-analytics.md) panel; the Emergency Center does not duplicate it.

Network outputs may link to safe replacement information but cannot activate or resolve an emergency.

An active emergency takes priority on authenticity surfaces. Only an active, official, verified replacement may appear; resolution returns to the current derived state.

High-risk identity monitoring incidents may prepare a creator-requested draft only. Monitoring cannot submit, approve, authorize, activate, publish, or deliver an emergency.

Verified Emergency Mode records a creator incident separately from delivery. An incident begins as a draft, captures the affected official account,
verifies any replacement account, receives revision-bound approval, and creates an immutable alert snapshot at activation.

Activation creates one canonical `creator_updates` account update. AudienceOwn then uses the existing atomic update delivery queue and each fan's selected
Recovery Pass method. Emergency Mode does not create recipients, transports, or a broadcast-email delivery path.

## Lifecycle

`draft` → `pending_verification` or `pending_approval` → `ready` → `active` → `resolved`.
Pre-activation incidents may be cancelled. Editing approved content increments the revision, invalidates approvals, and returns the incident to approval.

Replacement accounts record provider, stable provider ID, handle, canonical HTTPS profile, verification state and method, verifier, and timestamp.
Only a verified replacement can be marked official or displayed publicly.

## Creator experience

The Emergency Center at `/dashboard/emergency` creates incidents, previews content, verifies replacements, submits and approves alerts, activates delivery,
resolves or cancels incidents, and shows audit and delivery counts. The public creator page uses the active incident only; resolution removes the banner.
# Stage 5.2

Prepared replacement records are verified by authoritative provider identity before the existing approval, snapshot, creator-update, and Recovery Pass delivery lifecycle. No second incident or delivery pipeline is introduced. Verification revocation invalidates approval and immediately removes official public presentation.
# Identity continuity

Active emergency replacements remain governed by Stage 5 policy and public snapshot rules. Stage 6 adds continuity context without changing activation, authorization, snapshots, or Recovery Pass delivery.

# Emergency preparedness

Dashboard recovery readiness displays the latest canonical plan readiness state; it does not introduce a second readiness percentage.

Stage 5.1 adds private emergency templates and saved plans without changing the Stage 5.0 real-incident safety model.

## Templates and plans

A template is reusable message content: emergency type, severity, title, message, and an optional default official account. A plan is a prepared incident configuration. It copies executable content and binds it to an existing official connected account. Creating an incident from either source copies all runtime content into `creator_emergencies`; later source edits cannot change that incident. Source IDs are retained only for audit context.

Template and plan rows are creator-scoped, protected by forced RLS, unavailable to `anon`, and manageable only by owners or team members with `emergency_manage`. Archiving a template makes it unavailable for new prepared incidents without deleting history.

Proposed replacement provider, handle, and URL fields are private planning notes. Saving or validating them never creates an `emergency_replacement_accounts` row and never grants verified or official status. Real replacement verification remains part of the Stage 5.0 incident workflow.

## Readiness

A plan is ready only when its official affected account exists, content is valid, Recovery Pass and the public page are enabled, emergency management and activation roles are available, and critical plans have a separate eligible approver. Proposed replacement URLs must be canonical HTTPS. Validation stores the check time, blockers, and warnings; changes reset readiness until the next validation.

## Creator workflow

1. Save reusable verified wording as a template.
2. Create a plan for an official connected account.
3. Validate the plan and resolve blockers.
4. Run a drill and review aggregate recipient and transport estimates.
5. Create a real draft incident from the ready plan.
6. Complete normal verification, separate approval, recent reauthentication, activation, snapshot, and audit steps.

Prepared content is never public. Only active real emergencies are selected by the public creator page.
# Verified backups

Prepared backup accounts should be connected and provider-verified before an incident. Readiness distinguishes a display handle from stable provider identity and reports verification health and revalidation due dates.

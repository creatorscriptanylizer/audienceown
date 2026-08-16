# Creator insight engine

The Creator Dashboard header selects one deterministic insight from its existing server-assembled payload. `getCreatorInsight` is pure and performs no database reads, client fetches, browser branching, or AI calls.

Priority is: official account action required; unusable Recovery destination; update scheduled today or tomorrow; first protected participant; exact protected-audience milestone; 7-day Recovery Pass growth; recovery readiness at 80% or higher; recent confirmed delivery; drafts; uniquely strongest Recovery destination with at least three opt-ins; zero-participation onboarding; stable network.

Recovery facts come only from canonical Recovery Pass participation, destination-selection history, destination status, and destination opt-ins. Native provider followers, subscribers, and listeners are context only and never drive a recovery insight. Update counts and delivery states reuse `AudienceUpdatesSummary`; the evaluator does not aggregate deliveries again.

The typed output contains the selected category, priority, tone, copy, existing action route, and verified metadata. A future narration layer may rephrase that selected structured result, but the deterministic evaluator must remain the source of truth and the narrator must not add facts or actions.

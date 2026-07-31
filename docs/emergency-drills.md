# Emergency drills

Emergency drills safely rehearse readiness and activation checks. The dashboard marks drill mode with: “Simulation only — no audience notifications will be sent.”

## What a drill does

A drill checks creator permissions, affected-account availability, separate critical approver availability, activation permission, recent reauthentication, public-banner payload construction, Recovery Pass recipient eligibility, selected-method transport routing, and provider configuration. Results contain aggregate holder counts, transport counts, exclusion reasons, warnings, and blockers.

Recipient simulation reuses the normal account-update eligibility and transport rules with synthetic placeholder destinations. It does not return, persist, or display fan email addresses, phone numbers, push subscriptions, or other contact details.

## What a drill never does

- It does not call `activate_emergency`.
- It does not change a real incident to `active`.
- It does not create a `creator_update`, immutable activation snapshot, or delivery queue row.
- It does not invoke delivery workers or providers.
- It does not display a public emergency banner.
- It does not approve a real incident or satisfy later real approval.
- It does not treat proposed replacement details as verified.

Real activation continues to require current-content approval, separate approval for critical incidents, recent reauthentication, verified official replacement state, immutable snapshot creation, and append-only audit history.

## Troubleshooting

- **Plan blockers:** Revalidate after restoring the official account, Recovery Pass, public page, or required team roles.
- **Separate approver missing:** Grant `emergency_approve` to a different eligible team member before rehearsing a critical incident.
- **Reauthentication failed:** Reauthenticate and rerun the drill; a passing check still does not carry into real activation.
- **No eligible holders:** Check Recovery Pass status, the selected recovery method for each relationship, and account-update preferences.
- **Provider unavailable:** Configure the provider for each estimated transport. Drills never fall back to email.
- **Repeated run:** Completed drill runs return their stored aggregate result, making retries safe.
# Verification-safe drills

Safe drills never create provider ownership evidence. They may evaluate whether a prepared backup has current verification, whether a separate approver exists, and whether strong authorization and delivery readiness are configured without activating a public alert.

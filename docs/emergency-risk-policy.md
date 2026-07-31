# Emergency risk policy

`lib/emergency/risk-policy.ts` is the central deterministic evaluator. Policy version `2026-08-13.1` requires critical destination redirects to have a current high-confidence verification, stable identity, separate approver, current immutable content approval, recent strong authentication, no revocation, no suspicious identity change, and delivery readiness.

Scam and fake-account warnings additionally require explicit wording acknowledgement; AudienceOwn does not claim it independently confirmed fraud. Informational incidents without redirects can proceed with lower verification requirements. Decisions return stable blocker codes and warnings. Approvals and activation snapshots bind the policy version and deterministic snapshot hash so stricter policy or material destination/content/identity changes cannot reuse an old approval.

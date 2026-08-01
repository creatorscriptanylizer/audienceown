# Public trust display

Verified Creator Cards use this derivation. Restricted state suppresses claims; emergency recovery is presented first without changing the trust evaluation.

The public identity API adds a reduced `trust` object with a state, human label, concise summary, safe family-level signal labels, and last evaluation time. It never includes score, weights, source revision, reason codes, raw metadata, provider errors, evidence, tokens, secrets, hashes, or reviewer details.

Verified and strongly verified states may display verified destinations. Needs-attention copy remains neutral and useful. Restricted trust suppresses verified badges and evidence summaries and displays a neutral safety message; active emergency guidance remains authoritative.

Public data comes only from `get_public_creator_trust`, which accepts a public slug and returns a fixed JSON projection for a current, unexpired evaluation matching the identity revision. Missing or stale evaluations safely fall back to unverified.

Monitoring incidents, severities, fingerprints, provider failures, and creator security alerts are never public. Revoked presentation disappears automatically; neutral trust copy remains governed by the safe trust projection.

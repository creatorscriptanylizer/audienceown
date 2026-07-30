# AI-assisted draft enhancement

AI enhancement runs after a deterministic social draft is stored and before
approval. The canonical record remains `creator_updates`; publishing, scheduling,
recipient selection, Recovery Pass rules, and delivery execution are unchanged.

Creators opt in under Dashboard Settings. Defaults are disabled, natural tone,
standard variant, no emoji/hashtags, approval required, and AI auto-send disabled.
Voice settings cover audience, terminology, phrases to avoid, CTA style, tone, and
bounded custom instructions.

The social-draft trigger enqueues one active `social-draft-v1` job per update.
`POST /api/internal/ai/enhance-drafts` claims bounded jobs with expiring leases.
Schedule it independently from social polling. The worker calls the configured
adapter outside database transactions and never holds social polling leases.

Without `AI_ENHANCEMENT_ENABLED=true` and `OPENAI_API_KEY`, the worker stores
repeatable deterministic variants. Model-backed enhancement uses the OpenAI
Responses API with strict JSON Schema output, followed by application schema and
URL validation. No live key is required for boot or tests.

Every job captures the update revision. A result is applied only while the update
is still a draft at that revision. Manual edits increment the revision, preserve
the edit, and leave late variants available with a stale warning.

Core variants are standard, concise, detailed, email, browser, SMS, and recovery.
The source URL is stored separately and cannot be shortened, replaced, or silently
truncated. Selecting a variant is an explicit creator action.

Monthly generation and cost limits are enforced when enqueuing. Configure current
model price estimates through the two `AI_OPENAI_*_COST` variables. Usage records
are idempotent per job and never contain prompts or responses.

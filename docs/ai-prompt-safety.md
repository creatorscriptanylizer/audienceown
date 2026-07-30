# AI prompt and output safety

Prompt version `social-draft-v1` places normalized provider content, deterministic
copy, and creator voice settings inside a serialized `SOURCE_DATA` block. The
system instruction labels every value untrusted quoted data. Captions and creator
instructions cannot override grounding, schemas, URL preservation, or safety.

The model may receive only source title/description/URL/provider/object/event/time,
the deterministic draft, requested variants, and creator voice preferences. It
never receives OAuth tokens, API keys, follower records, recovery destinations,
delivery receipts, or private creator secrets. It never fetches source URLs.

Strict validation rejects missing/duplicate variants, excess fields, invalid
lengths, control characters, HTML, hidden unsafe Markdown links, additional URLs,
and any source-URL substitution. Unknown facts must be omitted. One bounded repair
attempt is permitted; there is no unbounded correction loop.

Logs contain safe IDs, provider/model/version, state, latency, and token counts.
They exclude prompts, response bodies, authorization headers, destinations, and
credentials.

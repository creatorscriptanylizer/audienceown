# Creator insight narration

Creator insight narration is an optional presentation layer. Trusted dashboard data is evaluated by the deterministic Creator Insight Engine first; only the selected title and message may then be rewritten. Category, priority, tone, action, and facts always remain deterministic.

## Trust and privacy boundary

Only the selected insight ID, category, tone, deterministic copy, and whitelisted aggregate metadata are sent. The payload excludes creator and fan identities, email addresses, phone numbers, cookies, tokens, OAuth credentials, recipient records, Supabase credentials, private account metadata, and the complete dashboard object. Connection, destination, and other warning/critical insights bypass narration entirely.

The OpenAI call is server-only and uses the Responses API, strict JSON Schema output, `store: false`, no tools, no retries, bounded output, and a short timeout. Output must contain only plain-text `title` and `message` fields. Deterministic validation rejects unsupported numbers, providers, relative time, engagement claims, category meaning changes, HTML, Markdown, URLs, emoji, malformed schemas, and excessive lengths. Exact numbers already present in the deterministic title or message are authoritative (for example, the `7` in `last 7 days`); other numeric transformations remain unsupported. Any failure returns the original insight unchanged.

## Cache and cost controls

Validated narration is held in a bounded 256-entry in-process cache for six hours. Keys are SHA-256 fingerprints of the contract version and minimized verified insight state; they contain no creator identity or PII. Concurrent misses for one fingerprint share one request. There is no database cache, polling, per-card narration, retry, or client request. Process restarts clear the cache.

Sanitized logs contain only category, fallback reason, latency, cache status, model identifier, and a fingerprint prefix. Prompts and generated text are not logged.

## Configuration

Narration is off by default. To enable it, set `CREATOR_INSIGHT_NARRATION_ENABLED=true`, `OPENAI_API_KEY`, and `OPENAI_CREATOR_INSIGHT_MODEL` in the server environment. `CREATOR_INSIGHT_NARRATION_TIMEOUT_MS` optionally controls the request timeout from 500–5,000 ms and defaults to 1,800 ms. Missing configuration falls back without breaking the dashboard.

Future work may add a shared external cache and evaluation-backed style variants. The deterministic engine must remain authoritative.

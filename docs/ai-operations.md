# AI enhancement operations

Protect `/api/internal/ai/enhance-drafts` and `/api/internal/ai/health` with
`AI_WORKER_SECRET`. Run enhancement batches frequently enough for the desired
draft latency, with `AI_MAX_CONCURRENCY` between 1 and 10. Jobs recover after lease
expiry and stop after three attempts.

Retryable failures include timeout, rate limiting, network failure, and transient
provider errors. Disabled AI, missing configuration, invalid instructions,
ineligible drafts, budget/limit exhaustion, unsafe output, and final schema failure
are skipped or permanent. Deterministic copy always exists before the job.

Health reports pending/processing jobs, expired leases, oldest pending time,
recent safe error codes, current-month usage/cost, and last success. Alert on old
pending work, expired leases, repeated schema failures, and budget saturation.

Local verification uses mocked/no-model tests:

```bash
npx supabase db reset
npx supabase test db
npm run test
```

Production requires server-only environment values, scheduler authentication,
current model pricing estimates, controlled budget defaults, and a live structured
output smoke test before enabling creators. No live model request is part of the
automated suite.

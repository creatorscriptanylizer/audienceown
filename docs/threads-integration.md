# Threads integration

Threads uses its own OAuth client, token, stable Threads user ID, scopes, review state, polling, and webhook reconciliation. Officially returned username and profile fields are safe metadata; canonical URLs must use `threads.net`.

Polling accepts stable post IDs, official timestamps, canonical permalinks, and permitted media summaries. Webhooks trigger authoritative polling and never create drafts directly. Replies from other users, followers, insights, scraping, and publishing are excluded.

# Public ecosystem API

`GET /api/public/creators/{slug}/ecosystem` and `GET /verify/{slug}/ecosystem.json` return `audienceown-ecosystem-v1`, creator links, categorized destinations, update time, and assertion URL. Results contain only current verified, official, public destinations.

`GET /api/public/ecosystem/lookup?url={exact-https-url}` uses exact canonical URL matching. Provider handle lookup requires both `provider` and `handle`; display-name and fuzzy matching are unsupported. Ambiguous results remain ambiguous. The rate-limited response omits database and stable provider IDs.

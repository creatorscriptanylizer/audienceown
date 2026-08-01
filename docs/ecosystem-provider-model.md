# Ecosystem provider model

The registry describes connection, identity and organization verification, discovery, webhook, polling, manual import, stable-ID, and revalidation capabilities. GitHub and Discord support stable provider identity when credentials are configured. Patreon remains review-aware because API grants vary. Website discovery uses verified domains. Newsletter, podcast/RSS, application, and other services use verified-domain evidence or constrained manual import until an authoritative API exists.

Missing credentials disable only that provider. OAuth tokens stay in existing encrypted connection storage; ecosystem rows never contain tokens, provider or webhook secrets, or raw responses.


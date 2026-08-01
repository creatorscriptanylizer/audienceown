# Provider Expansion IV

Stage 8.5 completes the fixed provider list with Spotify, Snapchat, Pinterest, and a provider-neutral manual-service flow. All OAuth connections use the shared signed-state, PKCE-capable callback, encrypted secrets, stable identity protection, normalized detections, approval-first drafts, monitoring, trust, and authenticity systems. No provider publishing, emergency activation, direct follower delivery, scraping, or raw-response persistence is introduced.

The internal worker is `POST /api/internal/providers/expansion-four/sync`; health and creator analytics remain aggregate and exclude audience data. Every capability defaults to `not_configured` until credentials and required provider access exist.

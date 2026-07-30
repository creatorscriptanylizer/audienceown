# Twitch
Configure `TWITCH_*`, `TWITCH_EVENTSUB_SECRET`, and callback
`/api/integrations/twitch/callback`. Register EventSub delivery at
`/api/webhooks/social/twitch`. HMAC signatures, ten-minute replay windows,
challenges, and event IDs are verified. Stream online/offline and channel updates
create drafts; live auto-send remains a separate explicit setting.

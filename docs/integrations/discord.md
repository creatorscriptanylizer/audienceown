# Discord
Configure `DISCORD_*`, bot token/public key, and
`/api/integrations/discord/callback`. Install a bot—never a user token/self-bot—
then validate guild/channel ownership and permissions. Only selected channels and
filters (preferably announcement-only) should ingest message events through the
verified webhook/event architecture. Attachments and message URLs are metadata.

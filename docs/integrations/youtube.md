# YouTube
Enable YouTube Data API v3 and configure the existing `GOOGLE_YOUTUBE_*` values.
Callback: `/api/integrations/youtube/callback`. Scope:
`youtube.readonly`. Uploads-playlist polling detects public videos and live states;
private/deleted/malformed items are skipped. Refresh and revocation are supported.

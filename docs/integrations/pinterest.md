# Pinterest
Configure `PINTEREST_*` and `/api/integrations/pinterest/callback`; PKCE is used.
Request `user_accounts:read boards:read pins:read` and select watched boards.
Official Pin polling stores cursors and normalizes ID, title, description,
image/video, URL, and creation time. Review/rate limits may restrict detection.

# Pinterest
Configure App ID `1600991` through `PINTEREST_APP_ID`, keep `PINTEREST_APP_SECRET` server-only, and set `PINTEREST_REDIRECT_URI` to `https://audienceown.com/api/integrations/pinterest/callback`. Pinterest's documented confidential authorization-code flow uses HTTP Basic client authentication and no PKCE.
Request exactly `user_accounts:read boards:read pins:read`. No write, advertising, billing, business-access, or catalog scopes are requested.
Official Pin polling stores cursors and normalizes ID, title, description,
image/video, URL, and creation time. Review/rate limits may restrict detection.

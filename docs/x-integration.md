# X integration

X uses authorization-code OAuth with signed state and S256 PKCE. Minimal scopes are `users.read`, `tweet.read`, and `offline.access` for background refresh. The stable numeric user ID anchors identity; username and display-name changes preserve it.

Polling reads authored posts only when the configured access tier entitles the endpoint. Protected accounts are not public sources. Replies and reposts follow connection policy. DMs, follower identities, engagement trust, write scopes, and publishing are excluded.

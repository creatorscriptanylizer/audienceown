# X
Configure `X_*` and `/api/integrations/x/callback`. OAuth 2 authorization-code
uses S256 PKCE and `users.read tweet.read offline.access`. Timeline detection
requires a qualifying X API product tier; otherwise the connection is marked
provider-plan-required. Rate limits honor backoff and reconnect handles invalid grants.

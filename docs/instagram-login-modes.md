# Instagram login modes

Two official configurations are modeled without mixing credentials or scopes:

- Instagram Login uses `INSTAGRAM_*`, an Instagram user credential, `graph.instagram.com`, and current `instagram_business_*` permissions.
- Facebook Login uses `META_*`, a managed Page, its linked professional account, a Page credential, `graph.facebook.com`, and Page/Instagram permissions.

The dashboard reports the active login mode, professional-account restriction, token category, review state, and selected-asset readiness. Missing review never becomes a verified fallback.

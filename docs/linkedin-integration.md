# LinkedIn integration

LinkedIn three-legged OAuth supports OIDC member session identity with `openid profile`. The authenticated `/v2/userinfo` pairwise `sub` is the immutable `external_account_id`; optional profile claims are metadata only. AudienceOwn does not consume or decode the ID token. OIDC proves control of the authenticated login session and is not marketed as LinkedIn real-world identity verification.

The self-service product does not provide personal audience metrics, refresh tokens, revocation, publishing, organization access, or content detection. Those capabilities are not advertised or requested.

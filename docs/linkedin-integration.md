# LinkedIn integration

LinkedIn three-legged OAuth supports OIDC member session identity with `openid profile`. OIDC proves control of the authenticated login session; it is not marketed as LinkedIn real-world identity verification and is private when restricted products are unavailable.

Member and organization post detection require separately enabled, approved, and granted read products. Posts use versioned REST requests and Rest.li 2.0 headers, stable URNs, published lifecycle state, authoritative timestamps, and safe permalinks. Publishing is disabled.

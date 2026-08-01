# Provider review readiness

The shared readiness contract reports credentials and product presence, required/granted/missing scopes, access level, review state, and availability of connection, identity, asset discovery, detection, webhooks, polling, manual import, and manual verification.

Readiness is configuration- and grant-derived. The safe default is `not_configured` with access level `none`. A provider card may say identity is available while automatic detection is unavailable. Unsupported operations return an explicit capability error.

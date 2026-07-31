# Emergency authorization

Emergency authorization sessions are short-lived, creator/user bound, purpose bound, optionally incident/revision bound, revocable, and atomically single-use. Purposes cover critical approval, activation, verification, replacement changes, and resolution. Assurance levels are recent login, password, MFA, and passkey; the application only records assurance actually supplied by the authentication provider.

No raw session secret is stored or logged. A SHA-256 fingerprint is persisted. Expired, consumed, revoked, wrong-user, wrong-purpose, wrong-incident, and wrong-revision sessions cannot be consumed. If the configured authentication provider cannot supply the required assurance, the operation returns a configuration blocker rather than simulating MFA.

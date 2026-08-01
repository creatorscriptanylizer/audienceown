# Authenticity key rotation

Signing keys are Ed25519 PEM values configured server-side. `AUTHENTICITY_SIGNING_KEY_ID` identifies the active key. The worker publishes only its public JWK, marks the new key active, and issues new assertions with it. Keep previous public keys published through the last assertion expiry by setting `retire_after`; overlap permits uninterrupted verification.

For routine rotation: deploy the new pair and key ID, retain the old public row, run the issuer, confirm new assertions and JWKS discovery, then retire the old public key after all old assertions expire. For compromise, set `revoked_at` immediately. Never place private material in `NEXT_PUBLIC_*`, logs, browser code, or database public-key rows.

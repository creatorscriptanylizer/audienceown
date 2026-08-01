# Ecosystem automation retry policy

Timeouts, rate limits, and temporary provider failures use bounded exponential retry. Revocation, missing permission/scope, authoritative not-found, privacy, identity conflict, invalid manifests, and unsafe remote destinations require reconnect or authoritative correction. Repeated observations correlate to one unresolved incident; metadata-only events cannot clear an identity conflict.

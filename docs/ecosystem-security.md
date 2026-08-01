# Ecosystem security

All ecosystem tables use RLS and FORCE RLS. Browser roles have read-only tables and cannot set verification state or stable IDs; creator RPCs enforce creator scope. Verification, synchronization, revocation, event append, and leases are service-role only.

Public output omits internal and stable IDs, permissions, scopes, evidence, errors, secrets, private communities and repositories, patron/member/subscriber data, trust scores, and weights. Only verified destinations can be official or primary. Revoked and archived destinations are hidden. Ecosystem code cannot activate emergencies, send Recovery Pass notifications, or publish content.


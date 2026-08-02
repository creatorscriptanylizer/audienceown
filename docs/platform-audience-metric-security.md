# Platform audience metric security

Both metric tables enable and force RLS. Authenticated creators receive SELECT only through creator-permission isolation. Claims, mutation, and snapshot RPCs require `service_role`, use an empty `search_path`, and expose no browser write path. The dashboard RPC omits metric IDs, connection IDs, asset IDs, provider stable IDs, scopes, tokens, and raw errors.

Audience size is informational analytics only. It does not affect identity verification, trust evaluation, authenticity, monitoring confidence, emergency activation, recovery delivery, provider publishing, or automation dispatch. Counts are checked non-negative integers; null is distinct from zero. No scraping or follower-list retrieval is implemented.

# Recovery analytics privacy

Live analytics is creator- and incident-scoped by a fixed-search-path security-definer RPC. The RPC returns aggregate counts only. It does not return follower identity, email, phone, address, delivery destination, internal delivery ID, stable provider account ID, session/visitor identity, token, or IP address. No fingerprinting or raw-IP storage was added.

Existing aggregate authenticity page counters are deliberately not reused as unique recovery visits because they cannot provide incident isolation or privacy-safe uniqueness. Unsupported measurements remain unavailable until the existing analytics system has an appropriate canonical event source and retention policy.

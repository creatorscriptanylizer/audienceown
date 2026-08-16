# Provider connection entitlements

AudienceOwn has no production billing provider, checkout endpoint, billing portal, or subscription webhook yet. The trusted `creator_plan_entitlements` projection is therefore the single server-side plan source: a missing row resolves to Free, and only `pro` with `trialing` or `active` status resolves to Pro. `past_due`, `unpaid`, `incomplete`, `inactive`, and `canceled` resolve to Free. `cancel_at_period_end` remains Pro while the subscription is still active.

Free permits one official and one backup `connected_accounts` row across all providers. Pro has no role limits. Every physical row counts, including healthy, syncing, degraded, expired, disconnected, configuration-pending, public-URL-required, and asset-selection-required rows. This prevents expired authorization or partial setup from becoming a quota bypass; completing provider removal physically deletes the row and releases the slot.

New OAuth starts are checked before redirect and again before persistence. Manual creation and delayed asset-selection persistence use the same rule. A database trigger takes a transaction-scoped advisory lock keyed by creator and role before every runtime insert, so competing requests serialize and the loser receives `connection_limit_reached`. Exact reconnects validate creator, connection, provider, and role and update the existing row. Meta's short-lived selection row is exempt only when its metadata points to an exact owned Facebook or Instagram reconnect target with the same role.

Downgrades never delete, disconnect, or promote accounts. Existing rows remain visible and preserved. New connections remain blocked until the relevant role count falls below one. Entitlements are not cached, so a future trusted billing webhook update takes effect on the next request.

The current upgrade destination is the existing pricing section (`/#pricing`). It is informational, not a checkout. Production Pro activation remains blocked on implementing the real billing provider, checkout/portal, and webhook synchronization into the trusted projection.

# Dashboard metric definitions

- **Protected Audience:** unique fans (deduplicated by AudienceOwn's stable `follower_contact_id`) with at least one currently valid, active Recovery Pass destination opt-in for the creator.
- **Recovery Connections:** total currently valid, active Recovery Pass destination opt-ins. One protected fan may have several connections.
- **Per-destination opt-ins:** unique active Recovery Pass opt-ins for that exact logical backup/recovery destination. Repeated interactions do not increase the count.
- **Recovery Audience Growth:** cumulative Protected Audience and Recovery Connections derived from `selected_at` timestamps only. Supported windows are 7, 30, 90 days, and all time.
- **Fans At Risk:** known active AudienceOwn relationships that are uncovered or partially configured, never external follower totals.
- **Recovery Readiness:** configuration completion across five required, creator-scoped checks: Recovery page published, Recovery Pass enabled, verified official account, verified backup account, and a server-validated emergency plan. The score is `Math.round(completed checks / 5 × 100)`, so valid values are 0, 20, 40, 60, 80, and 100. If any required source is unavailable, the score is unavailable (`—`) rather than treating the unknown check as incomplete. Labels use the same score: 0 **Not configured**; 1–39 **Getting started**; 40–79 **Partially ready**; 80–99 **Almost ready**; 100 **Recovery ready**.
- **Protected Ratio:** protected known fans divided by measurable active relationships; unavailable for zero denominator.
- **Native Platform Audience:** provider-reported followers/subscribers, available only as secondary account context. It is never added to Protected Audience, Recovery Connections, destination opt-ins, growth, or readiness.
- **Recent Opt-ins:** five bounded active connections without names or contact details.
- **Live Recovery Analytics:** the canonical Stage 8.6 snapshot; null metrics remain unavailable.

Compact counts use `Intl.NumberFormat`: 1,240 → 1.24K, 12,400 → 12.4K, and 1,240,000 → 1.24M. Exact values remain in accessible labels.
# Recovery attribution truthfulness

AudienceOwn currently proves Recovery Pass selection/opt-in intent. It does not prove that a provider-native follow, subscription, or guild join completed, so these records are called “Recovery Pass opt-ins” or “Recovery Connections,” never verified followers.

```text
Backup Instagram native followers: 8,000
Recovery Pass opt-ins: 320

AudienceOwn recovery count: 320
```

# Platform audience

Platform audience is the official provider count for the authoritative connected identity or selected creator asset. It is never inferred from engagement. Null means unavailable and remains distinct from zero. YouTube subscriber totals are approximate; Discord guild totals may be approximate. Growth is server-calculated and null when history is insufficient or the comparison is zero.
# Stage 8.8 audience and destination metrics

Main Audience is contextual native provider data only. Recovery Destination counts are unique active Recovery Pass preferences per canonical destination. Protected Audience deduplicates fans across destinations; destination coverage may overlap. Native account totals are never used as a recovery denominator. Full definitions are in [main audience and recovery destinations](main-audience-and-recovery-destinations.md).

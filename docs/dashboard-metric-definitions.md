# Dashboard metric definitions

- **Protected Fans:** unique known fans with a usable selected Recovery Pass.
- **Fans At Risk:** known active AudienceOwn relationships that are uncovered or partially configured, never external follower totals.
- **Recovery Readiness:** the latest existing emergency-plan readiness state. Its percentage remains unavailable because no canonical percentage exists.
- **Protected Ratio:** protected known fans divided by measurable active relationships; unavailable for zero denominator.
- **Platform audience:** unavailable until an approved provider count and timestamp are stored.
- **Recent Opt-ins:** five bounded active connections without names or contact details.
- **Live Recovery Analytics:** the canonical Stage 8.6 snapshot; null metrics remain unavailable.

Compact counts use `Intl.NumberFormat`: 1,240 → 1.24K, 12,400 → 12.4K, and 1,240,000 → 1.24M. Exact values remain in accessible labels.
# Platform audience

Platform audience is the official provider count for the authoritative connected identity or selected creator asset. It is never inferred from engagement. Null means unavailable and remains distinct from zero. YouTube subscriber totals are approximate; Discord guild totals may be approximate. Growth is server-calculated and null when history is insufficient or the comparison is zero.
# Stage 8.8 audience and destination metrics

Main Audience is the authoritative public count for the selected official provider account. Recovery Destination counts are unique active Recovery Pass preferences per canonical destination. Global Protected Fans deduplicates fans across destinations; destination coverage may overlap. Estimated main-audience protection is explicitly approximate and is never an exact subscriber conversion or exact “fans at risk” calculation. Full definitions are in [main audience and recovery destinations](main-audience-and-recovery-destinations.md).

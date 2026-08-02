# Creator Command Dashboard

`/dashboard` is a server-rendered operational overview assembled by `lib/dashboard/creator-dashboard.ts`. A bounded set of creator-scoped queries runs in parallel and reuses recovery, emergency, identity, authenticity, ecosystem, and Stage 8.6 data. Refresh uses `router.refresh()` without a browser data waterfall.

The responsive layout uses four KPIs, a wide platform breakdown beside recent opt-ins, a three-card middle row, and compact operational cards. It collapses to two columns on tablet and one on narrow screens. Platform audience counts remain unavailable because the current schema has no approved authoritative count source. Recent opt-ins use “New protected fan” and never serialize contact details.
# Stage 8.8 platform tiles

The platform breakdown renders all 12 approved providers with local colored icons, connection and verification state, authoritative compact counts when available, units, freshness, and safe hidden/review/permission/unsupported states. Sparklines and growth are absent until authoritative snapshot thresholds are met.
# Stage 8.8 dashboard section

“Audience & Recovery Destinations” replaces the generic platform breakdown. Its visually prominent Main Audience card uses official API data, while separate destination cards use AudienceOwn opt-ins, explicit account roles, verification, and overlap-aware coverage. Connected state is resolved independently of metric availability.

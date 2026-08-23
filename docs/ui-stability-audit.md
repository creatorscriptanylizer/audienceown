# UI architecture and deployment stability audit

Audit date: 2026-08-23. Scope: current worktree candidate. This is an architecture audit; no visual styles were changed.

## Route inventory

All routes inherit `app/layout.tsx`, which imports `app/globals.css`. Auth routes additionally inherit `app/(auth)/layout.tsx`; dashboard routes inherit `app/dashboard/layout.tsx` and mount `DashboardShell`; settings and authenticity add their segment layouts.

| Route | Page and mounted tree | Local styles | Shared primitives |
| --- | --- | --- | --- |
| `/` | `app/page.tsx` → marketing navigation, hero, pricing, footer | none; landing implementation is global | `PlatformBrandIcon`, `FeatureIcon` |
| `/register`, `/login` | auth pages → `AuthForm`, Google auth | none; auth shell/form are global | `AuthForm`, `GoogleAuthButton`, `Logo` |
| `/dashboard` | page → `CreatorCommandDashboard` | `creator-command-dashboard.css` | dashboard shell/nav, platform icon, product-state vocabulary |
| `/dashboard/creator-page` | page → `CreatorForm`, `RecoveryPassCard` | `creator-page.css`, `recovery-pass-card.css` | shell/nav, platform icon |
| `/dashboard/updates` | page → `UpdatesActivityCommandCenter` | `updates-activity-command-center.css` | shell/nav, platform icon, local time |
| `/dashboard/platforms` | page → `PlatformsManager` → `RecoveryNetworksPage` and connection selector | three colocated CSS Modules; some modal classes still depend on globals | shell/nav, platform icon, product-state |
| `/dashboard/audience` | page → `AudienceControls` | `audience.css` | shell/nav, platform icon, product-state, copy link |
| `/dashboard/verified-identity` | redirect-only compatibility page → authenticity page → identity controls/public preview | two page CSS files plus public preview module | shell/nav, platform icon, product-state, copy link |
| `/dashboard/settings` | page inside `SettingsFrame` | `settings-workspace.css` | shell/nav, settings nav, product-state |
| `/dashboard/settings/plans` | page → `PlansBillingWorkspace` | `plans.css` plus settings workspace | shell/nav, settings nav, billing actions |
| `/onboarding/*` | onboarding layout → progress + step-specific component | onboarding and Recovery Pass setup remain global | `Logo`, `OnboardingProgress`, provider components |
| `/c/[slug]` | page → `RecoveryPassFlow` (healthy) or `PublicCreatorExperience` (emergency) | two Recovery Pass global-root files; emergency/public creator styling remains global | logo/brand icons and public data-state components |

## Duplicate and legacy implementations

| Area | Classification | Evidence / decision |
| --- | --- | --- |
| Dashboard | CANONICAL | `CreatorCommandDashboard`, mounted only by `/dashboard` |
| Your Platforms | CANONICAL | `PlatformsManager`, mounted by `/dashboard/platforms` |
| Recovery Networks | CANONICAL | `RecoveryNetworksPage`, mounted twice conditionally inside the single `PlatformsManager` state tree (summary and modal) |
| Recovery Networks | LEGACY | `RecoveryNetworkManager` is not mounted. Tests and two files still import its types/helpers, so it is not yet safely deletable |
| Updates & Activity | CANONICAL | `UpdatesActivityCommandCenter`, mounted only by `/dashboard/updates` |
| Provider Connection Modal | CANONICAL | modal state and `ProviderConnectionMethodSelector` inside `PlatformsManager` |
| Creator Page editor | CANONICAL | `app/dashboard/creator-page/page.tsx` + `CreatorForm` |
| Public creator route | CANONICAL | `/c/[slug]`; `app/[slug]/page.tsx` directly delegates for compatibility and is not a second tree |
| Audience | CANONICAL | `app/dashboard/audience/page.tsx`; analytics/recovery pages are distinct operational analytics, not duplicates |
| Verified Identity | CANONICAL | physical authenticity page; friendly URL is a redirect-only compatibility route |
| Identity / authenticity older workspaces | UNKNOWN | `/dashboard/identity` and `/dashboard/security` are separate product areas but overlap terminology and should not absorb Verified Identity UI |
| Auth Form | CANONICAL | shared `AuthForm` for login/register/forgot/reset |
| Signup | LEGACY compatibility | `/signup` redirects to `/register` |
| Pricing | CANONICAL (marketing) | `LandingPricing` on `/` |
| Pricing | CANONICAL (account billing) | `PlansBillingWorkspace` on settings/plans; same catalog, distinct transactional responsibility |

No duplicate files were deleted.

## Global CSS classification

`app/globals.css` is 1,193 lines and is the largest regression surface.

| Lines / group | Classification | Risk |
| --- | --- | --- |
| tokens, reset, body, focus, reduced motion | global foundation | expected, high fan-out |
| typography tokens, `.button`, `.input`, `.surface`, `.eyebrow`, state utilities | shared primitive | legitimate but high fan-out |
| early Recovery Pass card/flow and audience selectors | page-specific leakage | duplicates newer local ownership; high cascade risk |
| dashboard animation group | page-specific leakage | dashboard component now has its own stylesheet |
| Public Recovery Pass, acquisition, activation, management | page-specific leakage | very large public-route implementation in global scope |
| Landing V2 and hero/icon refinements | page-specific leakage | landing-only selectors affect all bundles |
| creator dashboard (line ~301) | page-specific leakage / legacy | overlaps component CSS; order-dependent |
| platforms workspace and multi-account configuration (~392–759) | page-specific leakage / legacy | overlaps CSS Modules but global modal class names remain active; highest regression risk |
| onboarding and Recovery Pass setup (~760–818) | page-specific leakage | onboarding-only |
| updates and publishing workspace (~819–1040) | page-specific leakage / legacy | overlaps local Updates stylesheet; broad selectors |
| emergency, delivery queue, Broadcast Studio (~1041–1168) | page-specific leakage | feature-only groups |
| price typography | page-specific leakage | landing-only |
| authenticated compatibility layer and legacy mappings (~1173–1193) | legacy shared override | intentionally broad cascade patch; highest cross-page typography risk |

Architectural reason temporarily retaining these groups: moving them would itself be a broad visual change. During stabilization they are frozen and documented technical debt. Extraction must happen group-by-group with all visual baselines approved in the same change.

## Shared component risk

| Primitive | Consumers | Responsibility | Recent/default-change evidence | Risk |
| --- | --- | --- | --- | --- |
| `DashboardShell` | every dashboard/settings/onboarding-complete product page | background, sidebar, header, main width/padding | modified in current uncommitted candidate | critical |
| `DashboardNavigation` | every dashboard route | route labels, active/hover treatment, mobile rail | current freeze test pins its appearance | critical |
| `SettingsFrame` | all settings routes | settings subnavigation and workspace frame | modified in current candidate | high |
| `PlatformBrandIcon` | landing, dashboard, platforms, updates, identity, public pages, onboarding | provider mark/color | shared across public and private contexts | high |
| `AuthForm` | four auth states | input/action/error treatment | modified in current candidate | high |
| `product-state` family | at least eight dashboard/loading/error paths | unavailable/error/skeleton presentation | shared fallback appearance | medium-high |
| `.button` / `.input` / `.surface` globals | repository-wide | base controls and surfaces | frozen tokens but global cascade | critical |
| `RecoveryNetworksPage` | platforms summary and modal | canonical recovery-network presentation | new canonical replacement, reuses legacy module/types | high |
| `ProviderConnectionMethodSelector` | platforms modal and account flow | provider connection choice | module-scoped; current candidate modified | high |

Git history was not rewritten or interpreted: “recent” above means modified relative to the current checked-in index, as shown by `git status`, not authorship attribution.

## Production render and deployment findings

Source proof comes from App Router page ownership and the emitted `.next/server/app-paths-manifest.json`; asset proof comes from build manifests and content-hashed `.next/static` files. `scripts/verify-production-build.mjs` records BUILD_ID and a manifest digest. Browser proof is provided by `e2e/ui-regression.spec.ts`, which requires status 200 and the exact canonical URL before screenshot comparison.

The previous launchd service ran `scripts/start-production.mjs` with working directory `/Users/nana/audienceown`. That means a build performed in the repository can mutate `.next` while the live process reads it. There was no atomic release pointer, candidate health/visual gate, recorded BUILD_ID, or rollback target. `ops/deploy-atomic.sh` defines the required immutable-release sequence. The plist must be installed from/configured to use `<release-root>/current`; the repository plist is evidence of the old unsafe topology and must not be considered production-ready as-is.

`next.config.ts` now uses `DEPLOYMENT_VERSION` as the Next deployment ID, providing version-skew protection. The atomic script builds before swapping `current`, tests the candidate with `next start`, preserves `previous`, and restarts only after all gates pass. It never changes the active release's `.next`.

## Database version safety

Previously, deployment had only documentation warnings; no executable release guard compared repository migrations with the linked Supabase migration table. `scripts/verify-migrations.mjs` now fails closed if the linked state cannot be read or any local migration version is absent remotely. The atomic deployment invokes it before building/restarting. It performs only Supabase migration-list diagnostics and never applies data/schema changes.

Current production migration state remains UNKNOWN until this guard is run with linked-project credentials and network access. Existing provider-launch documentation already reports a historically behind production schema; that is a launch blocker until the new guard passes.

## Visual regression system

`playwright.visual.config.ts` uses production `next start`, never `next dev`, and defines exactly the required 1440, 1024, and 390 widths. `e2e/ui-regression.spec.ts` covers the seven required canonical screens, authenticates through the real login route for protected screens, asserts no redirect/alternate tree, disables nondeterministic motion, fixes locale/timezone/time, and fails above 0.5% pixel difference. Local defaults use the documented Stage 8.8 and Recovery Pass fixtures; CI should inject equivalent stable fixture credentials.

Baselines are review artifacts under `e2e/__screenshots__`. A release is blocked if they are absent, the fixture is incomplete, a route redirects, or the pixels exceed tolerance.

## Remaining blockers at audit creation

1. Production Supabase migration parity has not yet been proven by the linked guard.
2. The launchd plist still points at the mutable repository instead of an immutable `current` release link.
3. Approved screenshot baselines must be generated and reviewed from a seeded, production-mode candidate.
4. Global page-style extraction remains frozen technical debt; do not attempt it during stabilization without baseline-backed approval.
5. The legacy Recovery Network component still owns helper/types consumed by tests and canonical code; extract nonvisual types/helpers before later deletion.

## Verification record

- Focused Vitest: 4 files, 27 tests passed.
- Full Vitest: 242 files, 2,096 tests passed.
- TypeScript: passed (`tsc --noEmit`).
- ESLint: passed.
- Production build: passed on Next.js 16.2.11; emitted 177 static pages and all expected dynamic routes.
- Production manifest proof: passed for all physical canonical pages plus the verified-identity compatibility redirect. Build ID `0leNYWkSH9U-mNXRwVmhR`; manifest digest `e709d43e19a475b717f98d60de64a1cf72d8ad1fb297d38ac2695786d058c258`.
- `git diff --check`: passed.
- Browser visuals: register baselines passed/generated at all three required widths against `next start`. Public Recovery Pass failed honestly with HTTP 404 because the read-only local database has no approved fixture. Protected screens were not run because creating the required local account/records was not authorized.
- Migration guard: failed closed because no `SUPABASE_ACCESS_TOKEN` is available to read linked production migration state. No migration or data change was attempted.
- In-app live-production inspection: unavailable because no browser connection was attached to this session. This is not substituted with a claim based on local code.

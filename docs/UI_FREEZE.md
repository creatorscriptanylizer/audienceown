# AudienceOwn UI freeze contract

Status: mandatory for every release while UI stabilization mode is active.

## Canonical route ownership

| Route | Canonical page | Layout chain | Canonical mounted UI |
| --- | --- | --- | --- |
| `/` | `app/page.tsx` | `app/layout.tsx` | `MarketingNav`, `HeroProtectionScene`, `LandingPricing`, `PublicFooter` |
| `/register` | `app/(auth)/register/page.tsx` | `app/layout.tsx` → `app/(auth)/layout.tsx` | `AuthForm`, `GoogleAuthButton` |
| `/login` | `app/(auth)/login/page.tsx` | `app/layout.tsx` → `app/(auth)/layout.tsx` | `AuthForm`, `GoogleAuthButton` |
| `/dashboard` | `app/dashboard/page.tsx` | `app/layout.tsx` → `app/dashboard/layout.tsx` | `DashboardShell`, `CreatorCommandDashboard` |
| `/dashboard/creator-page` | `app/dashboard/creator-page/page.tsx` | root → dashboard | `CreatorForm`, `RecoveryPassCard` |
| `/dashboard/updates` | `app/dashboard/updates/page.tsx` | root → dashboard | `UpdatesActivityCommandCenter` |
| `/dashboard/platforms` | `app/dashboard/platforms/page.tsx` | root → dashboard | `PlatformsManager` → `RecoveryNetworksPage`, `ProviderConnectionMethodSelector` |
| `/dashboard/audience` | `app/dashboard/audience/page.tsx` | root → dashboard | `AudienceControls`, `CopyLinkButton` |
| `/dashboard/verified-identity` | redirect-only `app/dashboard/verified-identity/page.tsx` → `app/dashboard/authenticity/page.tsx` | root → dashboard → authenticity layout | verified-identity page, `PublicVerifiedIdentityView`, `PublicIdentityForm` |
| `/dashboard/settings` | `app/dashboard/settings/page.tsx` | root → dashboard → `app/dashboard/settings/layout.tsx` | `SettingsFrame` and settings overview |
| `/dashboard/settings/plans` | `app/dashboard/settings/plans/page.tsx` | root → dashboard → settings | `PlansBillingWorkspace` |
| `/onboarding/*` | `app/onboarding/*/page.tsx` | root → `app/onboarding/layout.tsx` | `OnboardingProgress` plus the step component |
| `/c/[slug]` | `app/c/[slug]/page.tsx` | `app/layout.tsx` | healthy state: `RecoveryPassFlow`; emergency state: `PublicCreatorExperience` |

`/signup` is a compatibility redirect to `/register`. `/[slug]` is a compatibility delegate to `/c/[slug]`; it is not an independent implementation. `/dashboard/verified-identity` redirects to the physical `/dashboard/authenticity` segment, which is the only implementation.

## Approved shared visual primitives

The approved cross-route primitives are `DashboardShell`, `DashboardNavigation`, `SettingsFrame`, `Logo`, `PlatformBrandIcon`, `AuthForm`, `GoogleAuthButton`, `CopyLinkButton`, the `product-state` family, and the global `.button`, `.input`, `.surface`, `.eyebrow`, typography-token classes. A change to their default appearance requires visual approval for every consumer, not only the page that motivated it.

## CSS ownership

`app/globals.css` may contain only reset/foundation rules, design tokens, typography tokens, shared form/button/surface primitives, accessibility utilities, and truly cross-route shells with documented consumers. New page or feature selectors are prohibited there.

Page styling must use a CSS Module or be rooted under one unique page class in a stylesheet imported by that page/segment. Component styling must use a colocated CSS Module unless the component owns a documented, isolated global root. Importing another page's stylesheet is prohibited; shared rules must be extracted to an approved primitive. Existing global page groups listed in `docs/ui-stability-audit.md` are frozen technical debt, not precedent.

## No duplicate render paths

Each production URL has one page owner and one canonical mounted implementation. Compatibility URLs may only redirect or delegate directly. A second component implementing the same screen may not be added. Legacy code must be labelled in the audit, must not be mounted, and must be removed only in a separately reviewed cleanup.

## Visual regression gate

`npm run test:visual` is required before deployment. It runs the built app through `next start` at 1440×900, 1024×900, and 390×844 and compares dashboard, updates, platforms/recovery networks, audience, verified identity, register, and public Recovery Pass against checked-in baselines. The maximum accepted differing-pixel ratio is 0.5%. Baselines may be updated only in an explicitly approved visual-change review.

## Build and deployment proof

A release must pass `verify:ui-architecture`, `verify:migrations`, `verify:production-build`, visual tests, unit tests, lint, typecheck, and `git diff --check`. Production must execute from an immutable release directory. It is forbidden to run `next build` in the directory used by a running `next start`. The release symlink is changed only after build and gates succeed; HTML/RSC and `/_next/static` must come from that same release. Record release ID, Git commit, Next `BUILD_ID`, and manifest digest. Retain the previous release target for atomic rollback.

`ALLOW_UNVERIFIED_MIGRATIONS=1` and `SKIP_VISUAL_GATE=1` are emergency-only bypasses and are forbidden in the normal production environment.

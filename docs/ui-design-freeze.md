# AudienceOwn UI design freeze

The checked-in visual system in `app/globals.css` is the canonical AudienceOwn design system. It owns the product color tokens, typography roles, shared surfaces, inputs, buttons, auth shell, dashboard primitives, and responsive behavior.

Shared shell and navigation styling is owned by:

- `components/dashboard-shell.tsx`
- `components/dashboard-navigation.tsx`
- `components/settings-navigation.tsx`
- `components/dashboard/creator-command-dashboard.css`

Changes to those files affect multiple product pages and require an explicit UI task plus page-by-page visual regression verification. Functional auth, billing, routing, or data fixes must not change their colors, radii, spacing, typography, shadows, gradients, hover states, or responsive layout.

Page-only styling must use a unique page root or a CSS Module. Avoid unscoped element selectors in page styles. Shared primitives must not be changed to solve a page-specific layout issue.

The frozen core tokens are the near-black background and surface scale, violet accent scale, shared border alpha values, and the authenticated typography roles declared in `:root`. Do not duplicate or override these tokens in page styles.

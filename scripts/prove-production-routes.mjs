import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(".next/server/app-paths-manifest.json", "utf8"));
const expected = {
  "/page": "app/page.js",
  "/(auth)/register/page": "app/(auth)/register/page.js",
  "/(auth)/login/page": "app/(auth)/login/page.js",
  "/dashboard/page": "app/dashboard/page.js",
  "/dashboard/creator-page/page": "app/dashboard/creator-page/page.js",
  "/dashboard/updates/page": "app/dashboard/updates/page.js",
  "/dashboard/platforms/page": "app/dashboard/platforms/page.js",
  "/dashboard/audience/page": "app/dashboard/audience/page.js",
  "/dashboard/authenticity/page": "app/dashboard/authenticity/page.js",
  "/dashboard/verified-identity/page": "app/dashboard/verified-identity/page.js",
  "/dashboard/settings/page": "app/dashboard/settings/page.js",
  "/dashboard/settings/plans/page": "app/dashboard/settings/plans/page.js",
  "/onboarding/page": "app/onboarding/page.js",
  "/onboarding/accounts/page": "app/onboarding/accounts/page.js",
  "/onboarding/recovery-pass/page": "app/onboarding/recovery-pass/page.js",
  "/onboarding/ready/page": "app/onboarding/ready/page.js",
  "/c/[slug]/page": "app/c/[slug]/page.js",
};
const failures = Object.entries(expected).filter(([route, emitted]) => manifest[route] !== emitted);
if (failures.length) throw new Error(`ROUTE PROOF: emitted route mismatch: ${JSON.stringify(failures)}`);
console.log(JSON.stringify({ proved: expected, note: "/dashboard/verified-identity is an emitted redirect-only compatibility route to the single /dashboard/authenticity implementation" }, null, 2));

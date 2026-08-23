import { existsSync, readFileSync } from "node:fs";

const routes = [
  ["/", "app/page.tsx"],
  ["/register", "app/(auth)/register/page.tsx"],
  ["/login", "app/(auth)/login/page.tsx"],
  ["/dashboard", "app/dashboard/page.tsx"],
  ["/dashboard/creator-page", "app/dashboard/creator-page/page.tsx"],
  ["/dashboard/updates", "app/dashboard/updates/page.tsx"],
  ["/dashboard/platforms", "app/dashboard/platforms/page.tsx"],
  ["/dashboard/audience", "app/dashboard/audience/page.tsx"],
  ["/dashboard/verified-identity", "app/dashboard/verified-identity/page.tsx"],
  ["/dashboard/settings", "app/dashboard/settings/page.tsx"],
  ["/dashboard/settings/plans", "app/dashboard/settings/plans/page.tsx"],
  ["/onboarding/*", "app/onboarding/page.tsx"],
  ["/c/[slug]", "app/c/[slug]/page.tsx"],
];

const failures = [];
for (const [route, file] of routes) {
  if (!existsSync(file)) failures.push(`${route}: missing canonical page ${file}`);
}

const aliases = [
  ["app/(auth)/signup/page.tsx", 'redirect("/register")'],
  ["app/[slug]/page.tsx", 'from "@/app/c/[slug]/page"'],
  ["app/dashboard/verified-identity/page.tsx", 'redirect("/dashboard/authenticity")'],
];
for (const [file, marker] of aliases) {
  const source = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (!source.includes(marker)) failures.push(`${file}: compatibility route no longer delegates to its canonical route`);
}

const platforms = readFileSync("components/platforms-manager.tsx", "utf8");
if (!platforms.includes("<RecoveryNetworkManager")) failures.push("PlatformsManager no longer mounts the checkpoint RecoveryNetworkManager");
if (platforms.includes("<RecoveryNetworksPage")) failures.push("PlatformsManager mounted the post-checkpoint RecoveryNetworksPage");

if (failures.length) {
  console.error(failures.map((item) => `UI ARCHITECTURE: ${item}`).join("\n"));
  process.exit(1);
}
console.log(`UI architecture verified: ${routes.length} canonical route contracts, ${aliases.length} compatibility delegates.`);

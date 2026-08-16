import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const navigation = readFileSync(new URL("../components/marketing-nav.tsx", import.meta.url), "utf8");
const preview = readFileSync(new URL("../components/product-preview.tsx", import.meta.url), "utf8");
const heroScene = readFileSync(new URL("../components/hero-protection-scene.tsx", import.meta.url), "utf8");
const pricing = readFileSync(new URL("../components/landing-pricing.tsx", import.meta.url), "utf8");
const footer = readFileSync(new URL("../components/public-footer.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

describe("premium landing page", () => {
  it("provides the public navigation, mobile menu, and primary conversion paths", () => {
    for (const label of ["Product", "How it works", "Pricing", "Resources"]) expect(navigation).toContain(label);
    expect(navigation).not.toContain('["Trust",');
    expect(navigation).not.toContain('["FAQ",');
    expect(navigation).toContain('aria-expanded={open}');
    expect(navigation).toContain('aria-label={open ? "Close navigation" : "Open navigation"}');
    expect(navigation).toContain("Create your page, it&apos;s free");
    expect(page).toContain('href="/register"');
    expect(page).toContain('href="#how-it-works"');
  });

  it("tells the recovery story with a realistic product preview", () => {
    expect(page).toContain("Never lose");
    expect(page).toContain("Recovery Pass");
    expect(page).toContain("You send a recovery alert");
    expect(preview).toContain("Official Accounts");
    expect(preview).toContain("Backup Accounts");
    expect(preview).toContain("Direct connections");
    expect(preview).toContain("All systems healthy");
  });

  it("uses launch-safe provider and shared health wording", () => {
    expect(page).toContain('["youtube","YouTube","OAuth available"]');
    expect(page).toContain('["instagram","Instagram","OAuth available"]');
    for (const state of ["Healthy", "Syncing", "Action required", "Temporarily unavailable", "Disconnected", "Manual"]) expect(page).toContain(state);
    expect(page).not.toMatch(/\d[\d,]+ creators|\d[\d,]+ connected platforms|uptime/i);
  });

  it("states the Free and Pro limits without adding unsupported plans", () => {
    for (const item of ["1 Main Platform", "1 Backup Platform", "Up to 500 protected followers", "1 Emergency Recovery Alert each month", "1 Creator Update each month"]) expect(pricing).toContain(item);
    for (const item of ["Unlimited Connected Platforms", "Unlimited Backup Platforms", "Unlimited Protected Followers", "Unlimited Emergency Recovery Alerts", "Unlimited Creator Updates"]) expect(pricing).toContain(item);
    expect(pricing).toContain('yearly ? "10" : "12"');
    expect(pricing).not.toMatch(/Team plan|Enterprise plan/);
  });

  it("covers Creator Updates, accessible FAQ, trust routes, and the premium footer", () => {
    for (const update of ["New Video", "Livestream", "Podcast Episode", "Product Release", "Event", "General Announcement", "Community Update"]) expect(page).toContain(update);
    expect(page).toContain("<details");
    for (const route of ["/trust", "/privacy", "/terms", "/cookie-policy", "/refund-policy", "/google-api-disclosure", "/data-deletion"]) expect(footer).toContain(route);
    expect(footer).toContain("supportEmail");
    expect(footer).toContain("privacyEmail");
  });

  it("defines responsive grids, safe narrow layouts, focus styles, and reduced motion", () => {
    expect(css).toContain(".solution-grid");
    expect(css).toContain(".provider-grid");
    expect(css).toContain(".recovery-flow");
    expect(css).toContain(".updates-grid");
    expect(css).toContain(".health-grid");
    expect(css).toContain("@media(max-width:640px)");
    expect(css).toContain("@media(prefers-reduced-motion:reduce)");
    expect(css).toContain(".preview-subscribe input:focus");
    expect(css).toContain(".updates-grid{grid-auto-rows:1fr;grid-template-columns:1fr;gap:24px}");
    expect(css).toContain("@media(min-width:768px){.updates-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}");
    expect(css).toContain("@media(min-width:1440px){.updates-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}");
    expect(css).toContain(".updates-grid article:last-child{width:100%;height:100%;grid-column:auto}");
  });

  it("contains no localhost destinations", () => {
    expect(`${page}${navigation}${preview}${heroScene}${footer}`).not.toMatch(/localhost|127\.0\.0\.1/);
  });

  it("uses shared accessible provider icons and semantic feature colors", () => {
    const providers = readFileSync(new URL("../components/dashboard/platform-brand-icon.tsx", import.meta.url), "utf8");
    const features = readFileSync(new URL("../components/feature-icon.tsx", import.meta.url), "utf8");
    expect(page).toContain("<PlatformBrandIcon");
    expect(preview).toContain("<PlatformBrandIcon");
    expect(providers).toContain('aria-label={`${label} logo`}');
    for (const provider of ["youtube", "instagram", "tiktok", "x", "twitch", "facebook", "discord", "website", "podcast", "newsletter"]) expect(providers).toContain(`${provider}:`);
    for (const tone of ["purple", "blue", "green", "orange", "red", "pink"]) expect(features).toContain(`${tone}:`);
    for (const kind of ["recovery", "audience", "platforms", "backups", "hacked", "suspended", "broken-link", "restart", "lost-access", "recovery-alert", "followers-notified", "found-again", "video", "livestream", "podcast", "product", "event", "announcement", "community"]) expect(features).toContain(`\"${kind}\"`);
    expect(features).toContain("FaYoutube");
    expect(features).toContain("FaInstagram");
    expect(features).toContain("FaTiktok");
    expect(page).toContain("<PremiumFeatureIcon");
  });

  it("uses followers consistently in public marketing copy", () => {
    expect(page).toContain("AudienceOwn gives your followers");
    expect(page).toContain("Followers see your backup accounts");
    expect(pricing).toContain("Up to 500 protected followers");
    expect(page).not.toMatch(/your people|People choose|Let people|Fans see|protected fans/i);
  });

  it("renders a motion-safe interactive protection scene with every requested orbiting platform", () => {
    expect(page).toContain("<HeroProtectionScene");
    expect(heroScene).toContain('from "framer-motion"');
    expect(heroScene).toContain('from "gsap"');
    expect(heroScene).toContain('document.addEventListener("visibilitychange"');
    expect(heroScene).toContain("useReducedMotion");
    expect(heroScene).toContain("shield-energy-sweep");
    expect(heroScene).toContain("network-line");
    expect(heroScene).toContain("is-rippling");
    for (const provider of ["youtube", "instagram", "tiktok", "x", "twitch", "facebook", "discord", "linkedin", "website", "newsletter"]) expect(heroScene).toContain(`"${provider}"`);
  });
});

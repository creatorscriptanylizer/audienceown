import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const policy = readFileSync(resolve("app/cookie-policy/page.tsx"), "utf8");
const legacyRoute = readFileSync(resolve("app/cookies/page.tsx"), "utf8");
const footer = readFileSync(resolve("components/public-footer.tsx"), "utf8");
const authLayout = readFileSync(resolve("app/(auth)/layout.tsx"), "utf8");
const settings = readFileSync(resolve("app/dashboard/settings/page.tsx"), "utf8");
const trustCenter = readFileSync(resolve("app/trust/page.tsx"), "utf8");

describe("Cookie Policy public surface", () => {
  it("publishes complete SEO and social metadata", () => {
    expect(policy).toContain('title: "Cookie Policy"');
    expect(policy).toContain('description: "How AudienceOwn uses cookies');
    expect(policy).toContain('canonical: "/cookie-policy"');
    expect(policy).toContain('title: "Cookie Policy · AudienceOwn"');
    expect(policy).toContain('url: "/cookie-policy"');
  });

  it("is publicly discoverable across footer, legal, and Trust navigation", () => {
    for (const source of [footer, authLayout, settings]) {
      expect(source).toContain('href="/cookie-policy"');
    }
    expect(trustCenter).toContain('"/cookie-policy"');
    expect(legacyRoute).toContain('redirect("/cookie-policy")');
  });

  it("describes only browser technologies found in the application", () => {
    expect(policy).toContain("Supabase Auth");
    expect(policy).toContain("short-lived cookies during supported OAuth flows");
    expect(policy).toContain("AudienceOwn uses local storage");
    expect(policy).toContain("The application stores Recovery Pass participation details");
    expect(policy).toContain("AudienceOwn does not currently use session storage or IndexedDB");
    expect(policy).toContain("does not currently use analytics cookies");
    expect(policy).toContain("does not currently use marketing or advertising cookies");
    expect(policy).not.toMatch(/Google Analytics|PostHog|Meta Pixel|Hotjar|Amplitude|Mixpanel/);
  });

  it("uses the final essential-cookie and browser-control language", () => {
    expect(policy).toContain('title="Essential (Strictly Necessary) Cookies"');
    expect(policy).toContain("The exact controls depend on your browser, operating system, and device.");
    expect(policy).toContain("Deleting cookies or browser storage does not automatically delete an AudienceOwn account");
    expect(policy).toContain("users will be able to review and update their preferences using the controls provided at that time");
  });

  it("links only to established internal legal routes", () => {
    for (const href of ["/privacy", "/terms", "/refund-policy", "/data-deletion"]) {
      expect(policy).toContain(`href="${href}"`);
    }
  });

  it("uses an accessible responsive legal-page structure", () => {
    expect(policy.match(/<h1\b/g)).toHaveLength(1);
    expect(policy).toContain("<h2 id={`${id}-heading`}");
    expect(policy).toContain("aria-labelledby={`${id}-heading`}");
    expect(policy).toContain("sm:text-5xl");
    expect(policy).toContain("lg:px-8");
    expect(policy).toContain("focus-visible:outline");
    expect(policy).toContain("print:bg-white");
  });
});

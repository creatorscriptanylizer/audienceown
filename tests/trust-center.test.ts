import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(resolve("app/trust/page.tsx"), "utf8");
const footer = readFileSync(resolve("components/public-footer.tsx"), "utf8");
const homepage = readFileSync(resolve("app/page.tsx"), "utf8");
const proxyTest = readFileSync(resolve("tests/proxy-routing.test.ts"), "utf8");

describe("Trust Center public surface", () => {
  it("publishes canonical SEO and social metadata", () => {
    expect(page).toContain('title: "Trust Center"');
    expect(page).toContain('canonical: "/trust"');
    expect(page).toContain('title: "Trust Center · AudienceOwn"');
    expect(page).toContain('url: "/trust"');
    expect(page).toContain('url: "/trust/opengraph-image.png"');
    expect(page).toContain('type="application/ld+json"');
  });

  it("replaces the standalone Security page everywhere", () => {
    expect(existsSync(resolve("app/security"))).toBe(false);
    expect(footer).not.toContain('href="/security"');
    expect(homepage).not.toContain('href="/security"');
    expect(proxyTest).not.toContain('"/security"');
    expect(footer).toContain('href="/trust"');
    expect(homepage).not.toContain('href="/trust"');
    expect(proxyTest).toContain('"/trust"');
  });

  it("links to every Trust resource", () => {
    const routes = {
      "/privacy": "app/privacy/page.tsx",
      "/terms": "app/terms/page.tsx",
      "/cookie-policy": "app/cookie-policy/page.tsx",
      "/refund-policy": "app/refund-policy/page.tsx",
      "/google-api-disclosure": "app/google-api-disclosure/page.tsx",
      "/data-deletion": "app/data-deletion/page.tsx",
    };
    for (const [href, file] of Object.entries(routes)) {
      expect(page).toContain(`"${href}"`);
      expect(footer).toContain(`href="${href}"`);
      expect(existsSync(resolve(file))).toBe(true);
    }
  });

  it("uses consistent contact addresses", () => {
    expect(page).toContain("supportEmail");
    expect(page).toContain("privacyEmail");
    expect(page).toContain("For account access, billing, platform connections, and general support");
    expect(page).toContain("For privacy questions, data requests, Google API questions, and personal information");
    expect(page).toContain("Need help?");
    expect(page).toContain("Building trust takes ongoing work.");
  });

  it("has an accessible responsive structure", () => {
    expect(page.match(/<h1\b/g)).toHaveLength(1);
    expect(page).toContain('aria-label="Trust Center navigation"');
    expect(page).toContain('aria-labelledby="resources-heading"');
    expect(page).toContain("focus-visible:outline");
    expect(page).toContain("motion-reduce:transform-none");
    expect(page).toContain("sm:grid-cols-2");
    expect(page).toContain("lg:grid-cols-3");
  });

  it("contains no development URLs", () => {
    expect(page).not.toMatch(/localhost|127\.0\.0\.1/i);
  });
});

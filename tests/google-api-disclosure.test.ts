import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const disclosure = readFileSync(resolve("app/google-api-disclosure/page.tsx"), "utf8");
const footer = readFileSync(resolve("components/public-footer.tsx"), "utf8");
const authLayout = readFileSync(resolve("app/(auth)/layout.tsx"), "utf8");
const settings = readFileSync(resolve("app/dashboard/settings/page.tsx"), "utf8");
const connectedAccounts = readFileSync(resolve("app/dashboard/settings/connected-accounts/page.tsx"), "utf8");
const trustCenter = readFileSync(resolve("app/trust/page.tsx"), "utf8");
const oauth = readFileSync(resolve("lib/youtube-oauth.ts"), "utf8");
const siteConfig = readFileSync(resolve("lib/public-site-config.ts"), "utf8");

describe("Google API Disclosure public surface", () => {
  it("publishes complete SEO and social metadata", () => {
    expect(disclosure).toContain('title: "Google API Disclosure"');
    expect(disclosure).toContain('canonical: "/google-api-disclosure"');
    expect(disclosure).toContain('title: "Google API Disclosure · AudienceOwn"');
    expect(disclosure).toContain('url: "/google-api-disclosure"');
    expect(disclosure).toContain("Last updated: August 6, 2026");
    expect(disclosure).toContain("Effective date: August 6, 2026");
  });

  it("is discoverable in footer, legal, and Trust navigation", () => {
    for (const source of [footer, authLayout, settings, connectedAccounts]) {
      expect(source).toContain('href="/google-api-disclosure"');
    }
    expect(trustCenter).toContain('"/google-api-disclosure"');
  });

  it("is public and links only to established internal destinations", () => {
    expect(disclosure).not.toMatch(/localhost|127\.0\.0\.1/i);
    const routes = {
      "/": "app/page.tsx",
      "/privacy": "app/privacy/page.tsx",
      "/cookie-policy": "app/cookie-policy/page.tsx",
      "/data-deletion": "app/data-deletion/page.tsx",
      "/terms": "app/terms/page.tsx",
      "/dashboard/settings/connected-accounts": "app/dashboard/settings/connected-accounts/page.tsx",
    };
    for (const [href, file] of Object.entries(routes)) {
      expect(disclosure).toContain(`href="${href}"`);
      expect(existsSync(resolve(file))).toBe(true);
    }
  });

  it("uses one semantic page heading and labelled policy sections", () => {
    expect(disclosure.match(/<h1\b/g)).toHaveLength(1);
    expect(disclosure).toContain("<h2 id={`${id}-heading`}");
    expect(disclosure).toContain("aria-labelledby={`${id}-heading`}");
    expect(disclosure).toContain("sm:text-5xl");
    expect(disclosure).toContain("lg:px-8");
    expect(disclosure).toContain("focus-visible:outline");
    expect(disclosure).toContain("print:bg-white");
  });

  it("documents only the implemented YouTube scope and read-only abilities", () => {
    expect(oauth).toContain('YOUTUBE_READONLY_SCOPE = "https://www.googleapis.com/auth/youtube.readonly"');
    expect(disclosure).toContain("requests one scope:");
    expect(disclosure).toContain("youtube.readonly");
    expect(disclosure).toContain("public upload, video, and livestream information");
    expect(disclosure).not.toMatch(/youtube\.upload|youtube\.force-ssl|youtube\.manage/i);
    expect(disclosure).not.toMatch(/can (?:upload|edit|delete videos|manage comments|change channel settings)/i);
    expect(disclosure).not.toContain("public upload playlist");
  });

  it("states data-use, token, disconnect, and deletion boundaries", () => {
    expect(disclosure).toContain("does not use Google user data for advertising");
    expect(disclosure).toContain("does not sell Google user data");
    expect(disclosure).toContain("encrypted and stored on the server");
    expect(disclosure).toContain("Browser clients do not receive raw provider tokens");
    expect(disclosure).toContain("will never request additional Google permissions unless the Creator explicitly authorizes");
    expect(disclosure).toContain("revocation is pending");
    expect(disclosure).toContain('href="/data-deletion"');
    expect(disclosure).toContain('href="/privacy"');
  });

  it("uses consistent Google and YouTube terminology", () => {
    expect(disclosure).toContain("Google Sign-In and YouTube authorization are separate");
    expect(disclosure).toContain("Google API Services User Data Policy");
    expect(disclosure).toContain("Limited Use requirements");
    expect(disclosure).toContain("or this disclosure, please contact");
    expect(disclosure).toContain("supportEmail");
    expect(siteConfig).toContain('supportEmail: "support@audienceown.com"');
  });
});

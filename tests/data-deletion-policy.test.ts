import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const policy = readFileSync(resolve("app/data-deletion/page.tsx"), "utf8");
const footer = readFileSync(resolve("components/public-footer.tsx"), "utf8");
const homepage = readFileSync(resolve("app/page.tsx"), "utf8");
const trustCenter = readFileSync(resolve("app/trust/page.tsx"), "utf8");
const proxy = readFileSync(resolve("proxy.ts"), "utf8");

describe("Data Deletion Policy public surface", () => {
  it("publishes complete SEO and social metadata", () => {
    expect(policy).toContain('title: { absolute: "Data Deletion | AudienceOwn" }');
    expect(policy).toContain("Learn how to request deletion of your AudienceOwn account and personal data");
    expect(policy).toContain('canonical: "/data-deletion"');
    expect(policy).toContain('title: "Data Deletion | AudienceOwn"');
    expect(policy).toContain('url: "/data-deletion"');
    expect(policy).toContain("Last updated: August 13, 2026");
    expect(policy).toContain("Effective date: August 13, 2026");
  });

  it("is public and discoverable in footer and Trust navigation", () => {
    expect(proxy).toContain('matcher: ["/dashboard/:path*", "/onboarding/:path*"]');
    expect(footer).toContain('href="/data-deletion"');
    expect(footer).toContain("Data Deletion Policy");
    expect(homepage).not.toContain('href="/trust"');
    expect(trustCenter).toContain('"/data-deletion"');
  });

  it("links only to established internal routes", () => {
    const routes = {
      "/": "app/page.tsx",
      "/privacy": "app/privacy/page.tsx",
      "/terms": "app/terms/page.tsx",
      "/cookie-policy": "app/cookie-policy/page.tsx",
      "/google-api-disclosure": "app/google-api-disclosure/page.tsx",
      "/dashboard/settings/account": "app/dashboard/settings/account/page.tsx",
      "/dashboard/settings/connected-accounts": "app/dashboard/settings/connected-accounts/page.tsx",
    };
    for (const [href, file] of Object.entries(routes)) {
      expect(policy).toContain(`href="${href}"`);
      expect(existsSync(resolve(file))).toBe(true);
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

  it("does not contain development links or fake retention periods", () => {
    expect(policy).not.toMatch(/localhost|127\.0\.0\.1/i);
    expect(policy).not.toMatch(/\b(?:7|14|30|60|90)[- ]day(?:s)?\b/i);
    expect(policy).toContain("does not assign a single retention period");
  });

  it("states the implemented deletion boundaries without guarantees", () => {
    expect(policy).toContain("Deletion is reported as complete only when the request succeeds");
    expect(policy).toContain("revocation is pending");
    expect(policy).toContain("does not currently provide a standalone control to detach Google Sign-In");
    expect(policy).toContain("does not separately confirm deletion of every uploaded media object");
    expect(policy).toContain("does not delete a Google account, YouTube channel, video, comment");
    expect(policy).toContain("Never send passwords, OAuth tokens, one-time verification codes");
    expect(policy).toContain("Account deletion is intended to be permanent");
    expect(policy).toContain("Browser-local data and server-side records are managed independently");
    expect(policy).toContain("does not retain information longer than reasonably necessary");
    expect(policy).toContain('title="Facebook and Meta data"');
    expect(policy).toContain("does not delete your Facebook or Instagram account");
    expect(policy).toContain('title="What happens after a request"');
    expect(policy).toContain("privacyEmail");
    expect(policy).toContain("from the email address associated with your AudienceOwn account");
    expect(policy).not.toContain("supportEmail");
  });
});

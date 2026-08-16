import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const footer = readFileSync(resolve("components/public-footer.tsx"), "utf8");

describe("Public footer", () => {
  it("uses a semantic, accessible five column structure", () => {
    expect(footer).toContain("<footer");
    expect(footer).toContain('aria-label="AudienceOwn footer"');
    expect(footer).toContain('aria-label="Trust resources"');
    expect(footer).toContain('aria-label="Product links"');
    expect(footer).toContain('aria-label="Company links"');
    expect(footer).toContain('aria-label="Footer utility links"');
    expect(footer).toContain("xl:grid-cols-[1.2fr_.9fr_.75fr_.75fr_1.4fr]");
    expect(footer).toContain("sm:grid-cols-2");
    expect(footer).toContain("lg:grid-cols-3");
  });

  it("links only to public destinations that exist", () => {
    for (const href of ["/", "/#product", "/#pricing", "/#faq", "/contact", "/trust", "/privacy", "/terms", "/cookie-policy", "/refund-policy", "/google-api-disclosure", "/data-deletion"]) {
      expect(footer).toContain(`href="${href}"`);
    }
    expect(footer).not.toMatch(/href="\/(about|blog|careers|status)"/);
  });

  it("provides both contact cards and accessible interactions", () => {
    expect(footer).toContain("supportEmail");
    expect(footer).toContain("privacyEmail");
    expect(footer).toContain("Account access, billing, and general support.");
    expect(footer).toContain("Privacy requests, data deletion, and Google API questions.");
    expect(footer).toContain("focus-visible:outline");
    expect(footer).toContain("motion-reduce:transition-none");
    expect(footer).toContain("Back to top");
  });
});

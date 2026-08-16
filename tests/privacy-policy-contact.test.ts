import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const privacyPolicy = readFileSync(resolve("app/privacy/page.tsx"), "utf8");

describe("Privacy Policy contact information", () => {
  it("publishes the operational contact and support mailboxes as accessible mailto links", () => {
    expect(privacyPolicy).toContain('href="mailto:contact@audienceown.com">contact@audienceown.com</a>');
    expect(privacyPolicy).toContain('href="mailto:support@audienceown.com">support@audienceown.com</a>');
  });

  it("does not publish unconfigured specialized mailboxes", () => {
    expect(privacyPolicy).not.toContain("privacy@audienceown.com");
    expect(privacyPolicy).not.toContain("developers@audienceown.com");
  });

  it("publishes the revised contact-information date", () => {
    expect(privacyPolicy).toContain("Last updated: August 15, 2026");
  });
});

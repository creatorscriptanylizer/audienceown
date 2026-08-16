import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const policy = readFileSync(resolve("app/refund-policy/page.tsx"), "utf8");
const footer = readFileSync(resolve("components/public-footer.tsx"), "utf8");
const authLayout = readFileSync(resolve("app/(auth)/layout.tsx"), "utf8");
const settings = readFileSync(resolve("app/dashboard/settings/page.tsx"), "utf8");

describe("Refund Policy public surface", () => {
  it("publishes the route with discoverable metadata and legal links", () => {
    expect(policy).toContain('title: "Refund Policy"');
    expect(policy).toContain('canonical: "/refund-policy"');
    expect(policy).toContain('url: "/refund-policy"');
    for (const href of ["/terms", "/privacy", "/contact"]) {
      expect(policy).toContain(`href="${href}"`);
    }
    for (const source of [footer, authLayout, settings]) {
      expect(source).toContain('href="/refund-policy"');
    }
  });

  it("covers the required billing and refund topics", () => {
    for (const heading of [
      "Free plans",
      "Free trials",
      "Monthly subscriptions",
      "Annual subscriptions",
      "Upgrades and downgrades",
      "Cancellation and refunds",
      "Duplicate or incorrect charges",
      "Unauthorized payments",
      "Service interruptions",
      "Payment processor and bank fees",
      "Taxes",
      "Chargebacks",
      "Refund abuse",
      "Enterprise customers",
      "How to request a refund",
      "How requests are reviewed",
      "Refund method",
      "Consumer rights",
    ]) {
      expect(policy).toContain(`title="${heading}"`);
    }
  });

  it("distinguishes cancellation and preserves mandatory consumer rights", () => {
    expect(policy).toContain("Cancellation prevents future renewal; a refund returns an eligible payment that has already been collected.");
    expect(policy).toContain("Nothing in this Refund Policy limits any refund, cancellation, withdrawal, or consumer protection rights that cannot be waived under applicable law.");
    expect(policy).toContain("Where applicable law grants consumers a statutory withdrawal period or cooling-off period for online purchases, AudienceOwn will honor those rights.");
    expect(policy).toContain("Such an agreement overrides this Refund Policy only where it expressly states different billing or refund terms.");
  });

  it("does not invent a processor, refund window, or unsafe support request", () => {
    expect(policy).not.toMatch(/Stripe|Paddle|PayPal|Braintree|Adyen/i);
    expect(policy).not.toMatch(/\b(?:7|14|30|60|90)[- ]day\b/i);
    expect(policy).toContain("we will never ask you to send a full payment-card number");
    expect(policy).toContain("Do not send full card details, security codes, passwords, authentication codes, or other sensitive credentials.");
    expect(policy).toContain("AudienceOwn does not receive or store full payment-card numbers.");
  });

  it("distinguishes AudienceOwn failures and protects legitimate disputes", () => {
    expect(policy).toContain("AudienceOwn service failures are different from outages, API changes, access restrictions, or other failures caused by Connected Platforms.");
    expect(policy).toContain("This does not limit lawful consumer rights or prevent anyone from raising a legitimate billing dispute.");
    expect(policy).toContain("Refund investigations may require verification of account ownership");
  });

  it("uses one semantic page heading and labelled policy sections", () => {
    expect(policy.match(/<h1\b/g)).toHaveLength(1);
    expect(policy).toContain("<h2 id={`${id}-heading`}");
    expect(policy).toContain("aria-labelledby={`${id}-heading`}");
    expect(policy).toContain("print:bg-white");
  });
});

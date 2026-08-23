import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync(new URL("../components/landing-pricing.tsx", import.meta.url), "utf8");
const planCatalog = readFileSync(new URL("../lib/billing/plan-catalog.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

describe("landing pricing", () => {
  it("offers monthly and yearly pricing with explicit annual context", () => {
    expect(component).toContain('useState<BillingInterval>("monthly")');
    for (const copy of ["Monthly", "Yearly", "Billed annually at $120", "Save $24 per year", "Save $24 every year. Cancel anytime."]) expect(component).toContain(copy);
    expect(component).not.toMatch(/Save 20%|Save more with yearly/);
    expect(component).toContain('yearly ? "10" : "12"');
    expect(component).toContain("/ month");
  });

  it("states the Free and Pro plan limits and approved copy", () => {
    for (const item of ["1 Main Platform", "1 Backup Platform", "Up to 500 protected followers", "1 Emergency Recovery Alert each month", "1 Creator Update each month", "Platform Health Monitoring", "Permanent Creator Page"]) expect(planCatalog).toContain(item);
    for (const item of ["Unlimited Connected Platforms", "Unlimited Backup Platforms", "Unlimited Protected Followers", "Unlimited Emergency Recovery Alerts", "Unlimited Creator Updates", "Priority Support", "Premium Creator Tools"]) expect(planCatalog).toContain(item);
    expect(component).not.toContain("as they become available");
  });

  it("keeps Free signup truthful and preserves Pro interval through unified auth", () => {
    expect(component).toContain("Create your free page");
    expect(component).toContain("Upgrade to Pro");
    expect(component).toContain("/register?mode=signup&intent=pro&interval=${interval}");
    expect(component).not.toContain('kind="checkout"');
    expect(component).toContain('href="/register?mode=signup"');
  });

  it("uses accessible controls and announces price changes", () => {
    expect(component).toContain('role="radiogroup"');
    expect(component).toContain('aria-label="Billing interval"');
    expect(component).toContain('role="radio"');
    expect(component).toContain("aria-checked");
    expect(component).toContain('aria-live="polite"');
    expect(component).toContain('aria-labelledby="free-plan-heading"');
    expect(component).toContain('aria-labelledby="pro-plan-heading"');
  });

  it("scopes responsive and reduced-motion presentation to pricing", () => {
    expect(page).toMatch(/<LandingPricing\s*\/>/);
    expect(css).toContain(".pricing-section");
    expect(css).toContain(".billing-toggle button:focus-visible");
    expect(css).toContain(".pricing-section .plan-card{padding:30px 22px}");
    expect(css).toContain("@media(prefers-reduced-motion:reduce)");
    expect(css).toContain(".billing-toggle-thumb");
    expect(css).toContain("transition:none");
  });
});

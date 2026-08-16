import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(path), "utf8");
const footer = read("components/public-footer.tsx");
const trust = read("app/trust/page.tsx");
const auth = read("app/(auth)/layout.tsx");
const account = read("app/dashboard/settings/account/page.tsx");

describe("canonical contact navigation", () => {
  it("routes footer Contact and Support links to the Contact page", () => {
    expect(footer).toContain('href="/contact">Contact</Link>');
    expect(footer).toContain('href="/contact">Support</Link>');
  });

  it("routes Support and Privacy cards with valid topic context", () => {
    for (const source of [footer, trust]) {
      expect(source).toContain('href="/contact?topic=account_sign_in"');
      expect(source).toContain('href="/contact?topic=privacy_request"');
    }
  });

  it("removes ordinary direct-email support navigation", () => {
    for (const source of [footer, trust, auth, account]) {
      expect(source).not.toMatch(/mailto:\$\{(?:supportEmail|privacyEmail)\}/);
    }
    expect(auth).toContain('href="/contact">Support</Link>');
    expect(account).toContain('href="/contact?topic=account_sign_in"');
  });
});

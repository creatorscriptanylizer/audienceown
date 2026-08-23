import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production authentication static assets", () => {
  const rootLayout = readFileSync("app/layout.tsx", "utf8");
  const proxy = readFileSync("proxy.ts", "utf8");
  const verifier = readFileSync("scripts/verify-production-auth-assets.mjs", "utf8");

  it("keeps onboarding under the global stylesheet root layout", () => {
    expect(rootLayout).toContain('import "./globals.css"');
  });

  it("does not route Next.js static assets through the authentication proxy", () => {
    expect(proxy).toContain('matcher: ["/login", "/dashboard/:path*", "/onboarding/:path*"]');
    expect(proxy).not.toContain('"/_next/:path*"');
  });

  it("checks deployed CSS and JavaScript status, MIME types, and onboarding selectors", () => {
    expect(verifier).toContain('expectedType');
    expect(verifier).toContain('"text/css"');
    expect(verifier).toContain('"application/javascript"');
    expect(verifier).toContain('".onboarding-shell"');
  });
});

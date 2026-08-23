import { describe, expect, it } from "vitest";
import { proAuthContinuation, safeProInterval, unifiedAuthNext } from "@/lib/public-auth-intent";
import { readFileSync } from "node:fs";

describe("unified public authentication intent", () => {
  it("accepts only canonical billing intervals", () => {
    expect(safeProInterval("monthly")).toBe("monthly");
    expect(safeProInterval("yearly")).toBe("yearly");
    expect(safeProInterval("price_attacker_controlled")).toBeNull();
  });

  it("builds a same-origin Pro continuation without accepting Price IDs", () => {
    expect(proAuthContinuation("yearly")).toBe("/auth/continue?intent=pro&interval=yearly");
    expect(unifiedAuthNext({ intent: "pro", interval: "monthly" })).toBe("/auth/continue?intent=pro&interval=monthly");
  });

  it("rejects external return destinations", () => {
    expect(unifiedAuthNext({ next: "https://evil.example/steal" })).toBe("/onboarding");
    expect(unifiedAuthNext({ next: "//evil.example/steal" })).toBe("/onboarding");
    expect(unifiedAuthNext({ next: "/dashboard/settings" })).toBe("/dashboard/settings");
  });

  it("keeps every public entry CTA on the auth page before continuation", () => {
    const navigation = readFileSync("components/marketing-nav.tsx", "utf8");
    const pricing = readFileSync("components/landing-pricing.tsx", "utf8");
    expect(navigation).toContain('href="/register?mode=signin"');
    expect(navigation).toContain('href="/register?mode=signup"');
    expect(pricing).toContain("/register?mode=signup&intent=pro&interval=${interval}");
    expect(pricing).not.toContain("/api/billing/checkout");
  });

  it("never resolves authenticated continuation during register page rendering", () => {
    const register = readFileSync("app/(auth)/register/page.tsx", "utf8");
    expect(register).not.toContain("auth.getUser()");
    expect(register).not.toContain("redirect(next)");
    expect(register).not.toContain("/api/billing/checkout");
    expect(register).toContain('params.mode !== "signin" && params.mode !== "signup"');
  });
});

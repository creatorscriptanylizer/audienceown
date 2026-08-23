import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("AudienceOwn shared UI design freeze", () => {
  it("keeps the canonical global design tokens", () => {
    const css = read("app/globals.css");
    expect(css).toContain("--background: #050505");
    expect(css).toContain("--surface: #101010");
    expect(css).toContain("--border: rgba(255,255,255,.09)");
    expect(css).toContain("--violet: #7c3aed");
    expect(css).toContain("--violet-bright: #8b5cf6");
    expect(css).toContain(".button-primary { background: var(--violet)");
    expect(css).toContain(".input {\n  width: 100%; min-height: 46px; border: 1px solid var(--border); border-radius: 11px; background: #090909;");
  });

  it("keeps the approved dashboard shell and navigation treatment", () => {
    const shell = read("components/dashboard-shell.tsx");
    const navigation = read("components/dashboard-navigation.tsx");
    expect(shell).toContain("rgba(76,29,149,.19)");
    expect(shell).toContain("bg-[#08080d]/85");
    expect(navigation).toContain("rounded-xl border border-transparent px-3 py-2.5");
    expect(navigation).toContain("bg-violet-400/[.11] text-violet-100");
    expect(navigation).toContain("drop-shadow");
  });

  it("keeps checkpoint-era shared page states available globally", () => {
    const css = read("app/globals.css");
    expect(css).toContain(".account-security-page");
    expect(css).toContain(".auth-register-story");
    expect(css).not.toContain(".settings-workspace");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`UNEXPECTED_REDIRECT:${path}`); }) }));
vi.mock("@/app/(auth)/actions", () => ({
  login: vi.fn(),
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

import RegisterPage from "@/app/(auth)/register/page";

async function render(params: Record<string, string>) {
  const page = await RegisterPage({ searchParams: Promise.resolve(params) } as never);
  return renderToStaticMarkup(page);
}

describe("public auth page entry", () => {
  it("renders sign in mode without resolving to an authenticated destination", async () => {
    const html = await render({ mode: "signin" });
    expect(html).toContain("Welcome back");
    expect(html).toContain("Sign in to AudienceOwn");
    expect(html).toContain("Forgot password?");
    expect(html).not.toContain("UNEXPECTED_REDIRECT");
  });

  it.each(["monthly", "yearly"])("renders signup with dormant Pro %s intent", async interval => {
    const html = await render({ mode: "signup", intent: "pro", interval });
    expect(html).toContain("Continue to AudienceOwn Pro");
    expect(html).toContain(`mode=signin&amp;intent=pro&amp;interval=${interval}`);
    expect(html).toContain("Create My AudienceOwn");
    expect(html).not.toContain("/dashboard");
    expect(html).not.toContain("/api/billing/checkout");
  });

  it("renders normal signup mode", async () => {
    const html = await render({ mode: "signup" });
    expect(html).toContain("Start protecting");
    expect(html).toContain("Create Your AudienceOwn");
    expect(html).toContain("Already have an account?");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`NEXT_REDIRECT:${destination}`);
  }),
  signInWithOAuth: vi.fn(),
  exchangeCodeForSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { signInWithGoogle } from "@/app/(auth)/actions";
import { GET } from "@/app/auth/callback/route";

describe("Google OAuth callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_URL", "https://audienceown.com");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://wrong-public-origin.example");
    mocks.createClient.mockResolvedValue({
      auth: {
        signInWithOAuth: mocks.signInWithOAuth,
        exchangeCodeForSession: mocks.exchangeCodeForSession,
      },
    });
    mocks.signInWithOAuth.mockResolvedValue({ data: { url: "https://accounts.google.test/authorize" }, error: null });
    mocks.exchangeCodeForSession.mockResolvedValue({ data: { session: { access_token: "test" } }, error: null });
  });

  it("uses the canonical production callback and onboarding destination for registration", async () => {
    const form = new FormData();
    form.set("next", "/onboarding");

    await expect(signInWithGoogle(form)).rejects.toThrow("NEXT_REDIRECT:https://accounts.google.test/authorize");
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "https://audienceown.com/auth/callback?next=/onboarding" },
    });
  });

  it("exchanges a valid code and redirects to onboarding", async () => {
    const response = await GET(new Request("https://audienceown.com/auth/callback?code=valid-code&next=/onboarding"));

    expect(mocks.exchangeCodeForSession).toHaveBeenCalledOnce();
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("valid-code");
    expect(response.headers.get("location")).toBe("https://audienceown.com/onboarding");
  });

  it("rejects an absolute next URL", async () => {
    const response = await GET(new Request("https://audienceown.com/auth/callback?code=valid-code&next=https://evil.example/steal"));

    expect(response.headers.get("location")).toBe("https://audienceown.com/dashboard");
  });

  it("does not attempt an exchange when code is missing", async () => {
    const response = await GET(new Request("https://audienceown.com/auth/callback?next=/onboarding"));

    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://audienceown.com/login?next=%2Fonboarding&error=missing_code");
  });

  it("does not continue as authenticated when code exchange fails", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ data: { session: null }, error: new Error("invalid code") });

    const response = await GET(new Request("https://audienceown.com/auth/callback?code=bad-code&next=/onboarding"));

    expect(response.headers.get("location")).toBe("https://audienceown.com/login?next=%2Fonboarding&error=callback");
  });

  it("continues to use localhost when APP_URL is localhost", async () => {
    vi.stubEnv("APP_URL", "http://localhost:3000/");
    const form = new FormData();
    form.set("next", "/dashboard");

    await expect(signInWithGoogle(form)).rejects.toThrow("NEXT_REDIRECT:https://accounts.google.test/authorize");
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "http://localhost:3000/auth/callback?next=/dashboard" },
    });
  });
});

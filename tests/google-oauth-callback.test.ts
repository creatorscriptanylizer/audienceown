import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`NEXT_REDIRECT:${destination}`);
  }),
  signInWithOAuth: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  requestHeaders: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: mocks.requestHeaders, cookies: mocks.cookies }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { signInWithGoogle } from "@/app/(auth)/actions";
import { GET } from "@/app/auth/callback/route";

describe("Google OAuth callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_URL", "https://audienceown.com");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://wrong-public-origin.example");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID", "test-local-client-id");
    vi.stubEnv("SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET", "test-local-client-secret");
    mocks.requestHeaders.mockResolvedValue(new Headers({ origin: "https://audienceown.com" }));
    mocks.cookies.mockResolvedValue({ getAll: () => [{ name: "sb-local-auth-token-code-verifier", value: "redacted" }] });
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

  it("keeps a validated provider handoff on the canonical auth callback", async () => {
    const form = new FormData();
    form.set("next", "/connect/provider?provider=youtube&role=official");

    await expect(signInWithGoogle(form)).rejects.toThrow("NEXT_REDIRECT:https://accounts.google.test/authorize");
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "https://audienceown.com/auth/callback?next=/connect/provider%3Fprovider%3Dyoutube%26role%3Dofficial" },
    });
  });

  it("exchanges a valid code and redirects to onboarding", async () => {
    const response = await GET(new Request("https://audienceown.com/auth/callback?code=valid-code&next=/onboarding"));

    expect(mocks.exchangeCodeForSession).toHaveBeenCalledOnce();
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("valid-code");
    expect(response.headers.get("location")).toBe("https://audienceown.com/onboarding");
  });

  it("automatically resumes the provider handoff after canonical code exchange", async () => {
    const response = await GET(new Request("https://audienceown.com/auth/callback?code=valid-code&next=/connect/provider%3Fprovider%3Dyoutube%26role%3Dofficial"));

    expect(response.headers.get("location")).toBe("https://audienceown.com/connect/provider?provider=youtube&role=official");
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

  it("keeps a malformed callback distinct from an inactive one-time confirmation link", () => {
    const loginPage = readFileSync("app/(auth)/login/page.tsx", "utf8");
    expect(loginPage).toContain("This authentication link is incomplete.");
    expect(loginPage).not.toContain("The sign-in link is incomplete or expired.");
  });

  it.each(["otp_expired", "flow_state_expired"])('routes a structured %s verification error to neutral confirmation recovery', async (errorCode) => {
    const response = await GET(new Request(`https://audienceown.com/auth/callback?error=access_denied&error_code=${errorCode}&next=/onboarding`));
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/confirmation");
    expect(location.searchParams.get("next")).toBe("/onboarding");
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("contains malicious continuation on an expired confirmation link", async () => {
    const response = await GET(new Request("https://audienceown.com/auth/callback?error=access_denied&error_code=otp_expired&next=https://evil.example/steal"));
    expect(new URL(response.headers.get("location")!).searchParams.get("next")).toBe("/dashboard");
  });

  it("does not continue as authenticated when code exchange fails", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ data: { session: null }, error: new Error("invalid code") });

    const response = await GET(new Request("https://audienceown.com/auth/callback?code=bad-code&next=/onboarding"));

    expect(response.headers.get("location")).toBe("https://audienceown.com/login?next=%2Fonboarding&error=callback");
  });

  it("fails safely before exchange when the PKCE verifier is missing", async () => {
    mocks.cookies.mockResolvedValue({ getAll: () => [] });

    const response = await GET(new Request("https://audienceown.com/auth/callback?code=valid-code&next=/onboarding"));

    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://audienceown.com/login?next=%2Fonboarding&error=callback");
  });

  it("accepts canonical forwarded metadata over the internal HTTP transport", async () => {
    const response = await GET(new Request("http://localhost:3000/auth/callback?code=valid-code&next=/onboarding", {
      headers: { "x-forwarded-host": "audienceown.com", "x-forwarded-proto": "https" },
    }));

    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("valid-code");
    expect(response.headers.get("location")).toBe("https://audienceown.com/onboarding");
  });

  it("refuses to start Google auth from localhost in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.requestHeaders.mockResolvedValue(new Headers({ origin: "http://localhost:3000" }));
    const form = new FormData();
    form.set("next", "/dashboard");

    await expect(signInWithGoogle(form)).rejects.toThrow("NEXT_REDIRECT:https://audienceown.com/login?next=%2Fdashboard&error=invalid_origin");
    expect(mocks.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("refuses to start Google auth from 127.0.0.1 in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.requestHeaders.mockResolvedValue(new Headers({ origin: "http://127.0.0.1:3000" }));
    const form = new FormData();
    form.set("next", "/dashboard/updates/update-1");

    await expect(signInWithGoogle(form)).rejects.toThrow("NEXT_REDIRECT:https://audienceown.com/login?next=%2Fdashboard%2Fupdates%2Fupdate-1&error=invalid_origin");
    expect(mocks.signInWithOAuth).not.toHaveBeenCalled();
  });

  it.each(["http://192.168.1.20:3000", "https://evil.example", "http://localhost:4000", "bad origin"])("rejects the foreign or malformed development origin %s", async (origin) => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.requestHeaders.mockResolvedValue(new Headers({ origin }));

    await expect(signInWithGoogle(new FormData())).rejects.toThrow("error=invalid_origin");
    expect(mocks.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("ignores spoofed forwarded headers in production", async () => {
    mocks.requestHeaders.mockResolvedValue(new Headers({
      origin: "https://audienceown.com",
      "x-forwarded-host": "192.168.1.20:3000",
      "x-forwarded-proto": "http",
    }));

    await expect(signInWithGoogle(new FormData())).rejects.toThrow("NEXT_REDIRECT:https://accounts.google.test/authorize");
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "https://audienceown.com/auth/callback?next=/onboarding" },
    });
  });

  it("allows canonical-domain development and selects the canonical callback", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.requestHeaders.mockResolvedValue(new Headers({ origin: "https://audienceown.com" }));

    await expect(signInWithGoogle(new FormData())).rejects.toThrow("NEXT_REDIRECT:https://accounts.google.test/authorize");
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "https://audienceown.com/auth/callback?next=/onboarding" },
    });
  });

  it.each(["http://localhost:3000", "http://127.0.0.1:3000", "https://evil.example", "not an origin"])("rejects the noncanonical production origin %s", async (origin) => {
    mocks.requestHeaders.mockResolvedValue(new Headers({ origin }));

    await expect(signInWithGoogle(new FormData())).rejects.toThrow("error=invalid_origin");
    expect(mocks.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("does not let forwarded headers authorize a foreign development origin", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.requestHeaders.mockResolvedValue(new Headers({
      origin: "https://evil.example",
      "x-forwarded-host": "audienceown.com",
      "x-forwarded-proto": "https",
    }));

    await expect(signInWithGoogle(new FormData())).rejects.toThrow("error=invalid_origin");
    expect(mocks.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("rejects a localhost callback in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = await GET(new Request("http://localhost:3000/auth/callback?code=valid-code&next=/dashboard/updates/update-1"));

    expect(response.status).toBe(400);
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("rejects a foreign development callback origin", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = await GET(new Request("http://192.168.1.20:3000/auth/callback?code=valid-code"));

    expect(response.status).toBe(400);
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });
});

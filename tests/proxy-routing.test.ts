import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

const authMocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getClaims: authMocks.getClaims },
  })),
}));

import { config, proxy } from "../proxy";

const nextConfig = {};

function matches(url: string) {
  return unstable_doesMiddlewareMatch({ config, nextConfig, url });
}

describe("Proxy routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth.example.test";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "public-key";
  });

  it.each(["/refund-policy", "/privacy", "/terms"])("bypasses Auth for %s", (path) => {
    expect(matches(path)).toBe(false);
    expect(authMocks.getClaims).not.toHaveBeenCalled();
  });

  it.each([
    "/",
    "/register",
    "/cookies",
    "/cookie-policy",
    "/data-deletion",
    "/trust",
    "/google-api-disclosure",
    "/accessibility",
    "/contact",
    "/manifest.webmanifest",
    "/favicon.ico",
    "/_next/static/chunks/app.js",
    "/_next/image",
    "/images/creator.webp",
    "/icons/icon.svg",
    "/auth/callback?code=oauth-code",
  ])("does not run Auth for public route or asset %s", (path) => {
    expect(matches(path)).toBe(false);
  });

  it("matches login only to enforce the canonical development browser origin", () => {
    expect(matches("/login")).toBe(true);
  });

  it.each(["/dashboard", "/dashboard/settings", "/onboarding"])("matches protected route %s", (path) => {
    expect(matches(path)).toBe(true);
  });

  it("redirects an unauthenticated dashboard request to a safe local login target", async () => {
    authMocks.getClaims.mockResolvedValue({ data: { claims: null }, error: null });
    const response = await proxy(new NextRequest("https://audienceown.example/dashboard/settings?tab=account"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://audienceown.example/login?next=%2Fdashboard%2Fsettings%3Ftab%3Daccount",
    );
    expect(authMocks.getClaims).toHaveBeenCalledOnce();
  });

  it("allows authenticated users to continue to protected routes", async () => {
    authMocks.getClaims.mockResolvedValue({ data: { claims: { sub: "authenticated" } }, error: null });
    const response = await proxy(new NextRequest("https://audienceown.example/dashboard"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(authMocks.getClaims).toHaveBeenCalledOnce();
  });

  it("redirects direct localhost login to the canonical development origin without running Auth", async () => {
    vi.stubEnv("APP_URL", "https://audienceown.com");
    const response = await proxy(new NextRequest("http://localhost:3000/login?next=%2Fdashboard%2Fplatforms"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://audienceown.com/login?next=%2Fdashboard%2Fplatforms");
    expect(authMocks.getClaims).not.toHaveBeenCalled();
  });

  it("allows a canonical login forwarded to the local Next.js server", async () => {
    vi.stubEnv("APP_URL", "https://audienceown.com");
    const response = await proxy(new NextRequest("http://localhost:3000/login", { headers:{ "x-forwarded-host":"audienceown.com", "x-forwarded-proto":"https" } }));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(authMocks.getClaims).not.toHaveBeenCalled();
  });
});

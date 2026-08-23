import { afterEach, describe, expect, it, vi } from "vitest";
import { requireSameOrigin } from "@/lib/emergency/request-security";

function request(origin: string | null, url = "http://next-internal:3000/api/contact", headers: HeadersInit = {}) {
  return new Request(url, { method: "POST", headers: { ...headers, ...(origin === null ? {} : { origin }) } });
}

describe("requireSameOrigin", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("rejects a mismatched request URL origin", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_URL", "https://audienceown.com");
    expect(requireSameOrigin(request("http://localhost:3000"))).toBe(false);
  });

  it("accepts the configured public origin behind an internal reverse-proxy URL", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "https://audienceown.com");
    expect(requireSameOrigin(request("https://audienceown.com"))).toBe(true);
  });

  it("rejects a foreign origin in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_URL", "https://audienceown.com");
    expect(requireSameOrigin(request("https://evil.example"))).toBe(false);
  });

  it("accepts an origin matching the request URL", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(requireSameOrigin(request("https://audienceown.com", "https://audienceown.com/api/contact"))).toBe(true);
  });

  it("rejects a foreign production origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(requireSameOrigin(request("https://evil.example", "https://audienceown.com/api/contact"))).toBe(false);
  });

  it("rejects a malformed origin", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(requireSameOrigin(request("not a valid origin"))).toBe(false);
  });

  it("does not trust spoofed forwarded host and protocol headers", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "https://audienceown.com");
    expect(requireSameOrigin(request("https://evil.example", "https://audienceown.com/api/contact", {
      "x-forwarded-host": "evil.example",
      "x-forwarded-proto": "https",
    }))).toBe(false);
  });

  it("preserves the missing Origin policy", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(requireSameOrigin(request(null, "https://audienceown.com/api/contact"))).toBe(true);
  });
});

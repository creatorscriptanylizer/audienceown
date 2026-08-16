import { afterEach, describe, expect, it, vi } from "vitest";
import { requireContactOrigin } from "@/lib/contact-request-security";

function request(origin: string | null) {
  return new Request("http://next-internal:3000/api/contact", {
    method: "POST",
    headers: origin === null ? {} : { origin },
  });
}

describe("requireContactOrigin", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    "https://audienceown.com",
    "https://dev.audienceown.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ])("allows %s in development", (origin) => {
    vi.stubEnv("NODE_ENV", "development");
    expect(requireContactOrigin(request(origin))).toBe(true);
  });

  it.each([
    "http://192.168.2.112:3000",
    "https://evil.example",
  ])("rejects %s in development", (origin) => {
    vi.stubEnv("NODE_ENV", "development");
    expect(requireContactOrigin(request(origin))).toBe(false);
  });

  it.each([
    "https://audienceown.com",
    "https://dev.audienceown.com",
  ])("allows %s in production", (origin) => {
    vi.stubEnv("NODE_ENV", "production");
    expect(requireContactOrigin(request(origin))).toBe(true);
  });

  it.each([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.2.112:3000",
    "https://evil.example",
    "not a valid origin",
  ])("rejects %s in production", (origin) => {
    vi.stubEnv("NODE_ENV", "production");
    expect(requireContactOrigin(request(origin))).toBe(false);
  });

  it("preserves the missing Origin policy", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(requireContactOrigin(request(null))).toBe(true);
  });

  it("does not authorize an origin by matching request.url", () => {
    vi.stubEnv("NODE_ENV", "test");
    const matchingRequest = new Request("https://evil.example/api/contact", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });
    expect(requireContactOrigin(matchingRequest)).toBe(false);
  });
});

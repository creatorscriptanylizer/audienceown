import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sender = vi.fn();
const rateLimit = vi.fn((...args: [string, number, number]) => args.length === 3);

vi.mock("@/lib/authenticity/rate-limit", () => ({ authenticityRateLimit: (key: string, limit: number, windowMs: number) => rateLimit(key, limit, windowMs) }));
vi.mock("@/lib/contact-email", () => ({
  configuredContactEmail: () => ({ sender, from: "AudienceOwn <contact@mail.audienceown.com>" }),
}));

import { POST } from "@/app/api/contact/route";

const valid = { topic: "account_sign_in", name: "Nana", email: "nana@example.com", handle: "nana", subject: "Need help", message: "Please help with my account.", website: "" };

function contactRequest(origin: string) {
  const body = new FormData(); Object.entries(valid).forEach(([key, value]) => body.set(key, value));
  return new Request("http://next-internal:3000/api/contact", {
    method: "POST",
    headers: { origin }, body,
  });
}

describe("POST /api/contact", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    rateLimit.mockReturnValue(true);
    sender.mockResolvedValue({ id: "email-1" });
  });

  afterEach(() => {
    sender.mockReset();
    rateLimit.mockReset();
    vi.unstubAllEnvs();
  });

  it("lets a valid local submission reach the email adapter", async () => {
    expect((await POST(contactRequest("http://localhost:3000"))).status).toBe(200);
    expect(sender).toHaveBeenCalledOnce();
  });

  it("returns 400 rather than 403 for an invalid payload from localhost", async () => {
    const request = new Request("http://next-internal:3000/api/contact", {
      method: "POST",
      headers: { origin: "http://localhost:3000" }, body: (() => { const body = new FormData(); Object.entries({ ...valid, message: "" }).forEach(([key, value]) => body.set(key, value)); return body; })(),
    });
    expect((await POST(request)).status).toBe(400);
    expect(sender).not.toHaveBeenCalled();
  });

  it("rejects a foreign origin before the email adapter", async () => {
    const response = await POST(contactRequest("https://evil.example"));
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(sender).not.toHaveBeenCalled();
  });

  it("returns 503 rather than 403 for provider failure after origin validation", async () => {
    sender.mockResolvedValue({ error: new Error("provider unavailable") });
    expect((await POST(contactRequest("https://audienceown.com"))).status).toBe(503);
    expect(sender).toHaveBeenCalledOnce();
  });

  it("returns 503 when the provider rejects a valid attachment", async () => {
    sender.mockResolvedValue({ error: new Error("provider unavailable") });
    const body = new FormData(); Object.entries(valid).forEach(([key, value]) => body.set(key, value));
    body.append("attachments", new File([new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])], "shot.png", { type: "image/png" }));
    const response = await POST(new Request("http://next-internal:3000/api/contact", { method: "POST", headers: { origin: "https://audienceown.com" }, body }));
    expect(response.status).toBe(503); expect(sender).toHaveBeenCalledWith(expect.objectContaining({ attachments: [expect.objectContaining({ filename: "shot.png", contentType: "image/png" })] }));
  });

  it.each([
    ["http://192.168.2.112:3000", 403],
    ["not a valid origin", 403],
  ] as const)("returns %i for rejected origin %s", async (origin, status) => {
    const response = await POST(contactRequest(origin));
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(sender).not.toHaveBeenCalled();
  });

  it("returns 200 for provider success after origin validation", async () => {
    expect((await POST(contactRequest("http://127.0.0.1:3000"))).status).toBe(200);
    expect(sender).toHaveBeenCalledOnce();
  });

  it("does not intermittently reject repeated localhost submissions", async () => {
    const statuses = await Promise.all(
      Array.from({ length: 12 }, () => POST(contactRequest("http://localhost:3000")).then((response) => response.status)),
    );
    expect(statuses).toEqual(Array(12).fill(200));
    expect(sender).toHaveBeenCalledTimes(12);
  });

  it("does not intermittently reject repeated canonical-domain submissions in development", async () => {
    const statuses = await Promise.all(
      Array.from({ length: 12 }, () => POST(contactRequest("https://audienceown.com")).then((response) => response.status)),
    );
    expect(statuses).toEqual(Array(12).fill(200));
    expect(sender).toHaveBeenCalledTimes(12);
  });

  it("returns 400 for an invalid canonical-domain submission", async () => {
    const request = new Request("http://next-internal:3000/api/contact", {
      method: "POST",
      headers: { origin: "https://audienceown.com" }, body: (() => { const body = new FormData(); Object.entries({ ...valid, message: "" }).forEach(([key, value]) => body.set(key, value)); return body; })(),
    });
    expect((await POST(request)).status).toBe(400);
    expect(sender).not.toHaveBeenCalled();
  });

  it("returns 429 for a rate-limited canonical-domain submission", async () => {
    rateLimit.mockReturnValue(false);
    expect((await POST(contactRequest("https://audienceown.com"))).status).toBe(429);
    expect(sender).not.toHaveBeenCalled();
  });

  it("allows the canonical production origin", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await POST(contactRequest("https://audienceown.com"))).status).toBe(200);
    expect(sender).toHaveBeenCalledOnce();
  });

  it.each([200, 400, 429, 503] as const)("sets no-store on a %i response", async (status) => {
    if (status === 400) {
      const request = new Request("http://next-internal:3000/api/contact", { method: "POST", headers: { origin: "https://audienceown.com", "content-type": "application/json" }, body: "{" });
      expect((await POST(request)).headers.get("cache-control")).toBe("no-store");
      return;
    }
    if (status === 429) rateLimit.mockReturnValue(false);
    if (status === 503) sender.mockResolvedValue({ error: new Error("provider") });
    const response = await POST(contactRequest("https://audienceown.com"));
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects a foreign production origin", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await POST(contactRequest("https://evil.example"))).status).toBe(403);
    expect(sender).not.toHaveBeenCalled();
  });
});

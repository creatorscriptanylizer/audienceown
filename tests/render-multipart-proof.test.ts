import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/internal/render-proof/multipart/route";
import { MAX_CONTACT_REQUEST_BYTES } from "@/lib/contact-form-contract";

const url = "https://audienceown-render-proof.example/api/internal/render-proof/multipart";
const secret = "render-proof-test-secret";
const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function authorizedRequest(body?: FormData, headers: HeadersInit = {}) {
  return new Request(url, {
    method: "POST",
    body,
    headers: { authorization: `Bearer ${secret}`, ...headers },
  });
}

function png(name: string, size: number) {
  const bytes = new Uint8Array(size);
  bytes.set(pngHeader);
  return new File([bytes], name, { type: "image/png" });
}

afterEach(() => vi.unstubAllEnvs());

describe("Render multipart proof route", () => {
  it("is unavailable unless explicitly enabled", async () => {
    vi.stubEnv("RENDER_MULTIPART_PROOF_ENABLED", "false");
    expect((await POST(authorizedRequest())).status).toBe(404);
  });

  it("requires the proof bearer secret", async () => {
    vi.stubEnv("RENDER_MULTIPART_PROOF_ENABLED", "true");
    vi.stubEnv("RENDER_MULTIPART_PROOF_SECRET", secret);
    expect((await POST(new Request(url, { method: "POST" }))).status).toBe(401);
  });

  it.each([1, 5])("accepts a valid %d MB PNG without delivery or persistence", async sizeMb => {
    vi.stubEnv("RENDER_MULTIPART_PROOF_ENABLED", "true");
    vi.stubEnv("RENDER_MULTIPART_PROOF_SECRET", secret);
    const form = new FormData();
    form.append("attachments", png(`proof-${sizeMb}.png`, sizeMb * 1024 * 1024));
    const response = await POST(authorizedRequest(form));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-audienceown-proof-reached")).toBe("application");
    expect(await response.json()).toMatchObject({ status: "accepted", receivedBytes: sizeMb * 1024 * 1024, fileCount: 1, validation: "success" });
  });

  it("accepts the 10 MB combined attachment contract", async () => {
    vi.stubEnv("RENDER_MULTIPART_PROOF_ENABLED", "true");
    vi.stubEnv("RENDER_MULTIPART_PROOF_SECRET", secret);
    const form = new FormData();
    form.append("attachments", png("proof-a.png", 5 * 1024 * 1024));
    form.append("attachments", png("proof-b.png", 5 * 1024 * 1024));
    const response = await POST(authorizedRequest(form));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "accepted", receivedBytes: 10 * 1024 * 1024, fileCount: 2, validation: "success" });
  });

  it("marks an above-envelope rejection as application-generated", async () => {
    vi.stubEnv("RENDER_MULTIPART_PROOF_ENABLED", "true");
    vi.stubEnv("RENDER_MULTIPART_PROOF_SECRET", secret);
    const response = await POST(authorizedRequest(undefined, { "content-length": String(MAX_CONTACT_REQUEST_BYTES + 1) }));
    expect(response.status).toBe(413);
    expect(response.headers.get("x-audienceown-proof-reached")).toBe("application");
    expect(await response.json()).toMatchObject({ status: "rejected", receivedBytes: MAX_CONTACT_REQUEST_BYTES + 1, validation: "request_too_large" });
  });
});

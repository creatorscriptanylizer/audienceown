import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

import { configuredContactEmail, CONTACT_EMAIL_TIMEOUT_MS } from "@/lib/contact-email";
import { CONTACT_EMAIL_FROM } from "@/lib/contact-form-contract";

describe("configuredContactEmail", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("DELIVERY_EMAIL_FROM", CONTACT_EMAIL_FROM);
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    send.mockResolvedValue({ data: { id: "provider-id" }, error: null });
  });

  afterEach(() => {
    send.mockReset();
    vi.unstubAllEnvs();
  });

  it.each([
    ["RESEND_API_KEY", ""],
    ["DELIVERY_EMAIL_FROM", ""],
    ["DELIVERY_EMAIL_FROM", "Visitor <visitor@example.com>"],
  ] as const)("fails closed when %s is invalid", (name, value) => {
    vi.stubEnv(name, value);
    expect(configuredContactEmail()).toEqual({ sender: null, from: null });
  });

  it("uses RESEND_FROM_EMAIL only when the canonical variable is absent", () => {
    vi.stubEnv("DELIVERY_EMAIL_FROM", undefined);
    vi.stubEnv("RESEND_FROM_EMAIL", CONTACT_EMAIL_FROM);
    expect(configuredContactEmail()).toMatchObject({ from: CONTACT_EMAIL_FROM, sender: expect.any(Function) });
  });

  it("makes one bounded provider attempt and requires a provider ID", async () => {
    const configured = configuredContactEmail();
    const input = { from: CONTACT_EMAIL_FROM, to: "contact@audienceown.com", replyTo: "visitor@example.com", subject: "Question", text: "Message" };
    await expect(configured.sender?.(input)).resolves.toEqual({ id: "provider-id" });
    expect(send).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith(input, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    const signal = send.mock.calls[0]?.[1]?.signal as AbortSignal;
    expect(signal.aborted).toBe(false);
    expect(CONTACT_EMAIL_TIMEOUT_MS).toBe(10_000);

    send.mockResolvedValueOnce({ data: null, error: { name: "provider_error" } });
    await expect(configured.sender?.(input)).resolves.toEqual({ error: { name: "provider_error" } });
  });
});

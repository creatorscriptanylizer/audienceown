import { describe, expect, it, vi } from "vitest";
import { Webhook } from "standardwebhooks";
import { handleResendWebhook } from "@/lib/delivery-webhooks/handler";
import {
  normalizeResendEvent,
  verifyResendWebhook,
} from "@/lib/delivery-webhooks/resend";

const secret = `whsec_${Buffer.from("audienceown-webhook-test-secret").toString("base64")}`;

function signedRequest(payload: string, date = new Date()) {
  const id = "event-test-1";
  const timestamp = Math.floor(date.getTime() / 1000).toString();
  const signature = new Webhook(secret).sign(id, date, payload);
  return new Request("http://localhost/api/webhooks/email/resend", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": signature,
    },
    body: payload,
  });
}

function fixture(type = "email.delivered") {
  return JSON.stringify({
    type,
    created_at: "2026-07-27T12:00:00.000Z",
    data: {
      created_at: "2026-07-27T11:59:00.000Z",
      email_id: "message-test-1",
      from: "updates@example.com",
      to: ["fan@example.com"],
      subject: "Update",
    },
  });
}

describe("Resend delivery webhooks", () => {
  it("verifies a signed raw payload with the official SDK and applies it", async () => {
    const apply = vi.fn().mockResolvedValue(undefined);
    const response = await handleResendWebhook(signedRequest(fixture()), {
      webhookSecret: secret,
      verify: verifyResendWebhook,
      apply,
    });
    expect(response.status).toBe(200);
    expect(apply).toHaveBeenCalledWith(expect.objectContaining({
      providerEventId: "event-test-1",
      providerMessageId: "message-test-1",
      type: "delivered",
    }));
  });

  it.each([
    ["email.sent", "accepted"],
    ["email.delivered", "delivered"],
    ["email.bounced", "bounced"],
    ["email.failed", "bounced"],
    ["email.suppressed", "bounced"],
    ["email.complained", "complained"],
    ["email.opened", "ignored"],
  ])("normalizes %s as %s", (rawType, expected) => {
    const data = rawType === "email.bounced"
      ? { email_id: "message-1", bounce: { type: "Permanent", message: "Mailbox unavailable" } }
      : rawType === "email.failed"
        ? { email_id: "message-1", failed: { reason: "Provider failure" } }
        : rawType === "email.suppressed"
          ? { email_id: "message-1", suppressed: { type: "Suppressed", message: "Suppressed" } }
          : { email_id: "message-1" };
    const event = normalizeResendEvent({
      type: rawType,
      created_at: "2026-07-27T12:00:00.000Z",
      data,
    } as never, "event-1");
    expect(event.type).toBe(expected);
  });

  it("rejects missing, tampered, and stale signatures", async () => {
    const apply = vi.fn();
    const missing = new Request("http://localhost", { method: "POST", body: fixture() });
    expect((await handleResendWebhook(missing, {
      webhookSecret: secret, verify: verifyResendWebhook, apply,
    })).status).toBe(401);

    const tampered = signedRequest(fixture());
    const tamperedRequest = new Request(tampered.url, {
      method: "POST",
      headers: tampered.headers,
      body: `${fixture()} `,
    });
    expect((await handleResendWebhook(tamperedRequest, {
      webhookSecret: secret, verify: verifyResendWebhook, apply,
    })).status).toBe(401);

    expect((await handleResendWebhook(
      signedRequest(fixture(), new Date("2020-01-01T00:00:00.000Z")),
      { webhookSecret: secret, verify: verifyResendWebhook, apply },
    )).status).toBe(401);
    expect(apply).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed signed JSON and 503 for processing failures", async () => {
    expect((await handleResendWebhook(signedRequest("{"), {
      webhookSecret: secret,
      verify: verifyResendWebhook,
      apply: vi.fn(),
    })).status).toBe(400);

    expect((await handleResendWebhook(signedRequest(fixture()), {
      webhookSecret: secret,
      verify: verifyResendWebhook,
      apply: vi.fn().mockRejectedValue(new Error("database unavailable")),
    })).status).toBe(503);
  });

  it("acknowledges ignored events without exposing destination data", async () => {
    const apply = vi.fn().mockResolvedValue(undefined);
    const response = await handleResendWebhook(signedRequest(fixture("email.opened")), {
      webhookSecret: secret,
      verify: verifyResendWebhook,
      apply,
    });
    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain("fan@example.com");
    expect(apply).toHaveBeenCalledWith(expect.objectContaining({ type: "ignored" }));
  });
});

import { describe, expect, it } from "vitest";
import twilio from "twilio";
import {
  isSmsOptOutKeyword,
  normalizeTwilioStatus,
} from "@/lib/delivery-webhooks/twilio";
import { handleTwilioStatusWebhook } from "@/lib/delivery-webhooks/twilio-handler";
import { handleTwilioInboundWebhook } from "@/lib/delivery-webhooks/twilio-inbound-handler";

describe("Twilio webhook normalization", () => {
  it.each([
    ["queued", "accepted"],
    ["accepted", "accepted"],
    ["sent", "accepted"],
    ["delivered", "delivered"],
    ["undelivered", "failed"],
    ["failed", "failed"],
    ["read", "ignored"],
    ["future_status", "ignored"],
  ])("maps %s to %s", (status, expected) => {
    expect(normalizeTwilioStatus({
      MessageSid: "SM123",
      MessageStatus: status,
    })).toMatchObject({ normalizedStatus: expected });
  });

  it("retains safe error code and category without phone destinations", () => {
    const event = normalizeTwilioStatus({
      MessageSid: "SM123",
      MessageStatus: "undelivered",
      ErrorCode: "30005",
      To: "+14155552671",
    });
    expect(event).toMatchObject({
      errorCode: "30005",
      failureCategory: "invalid_destination",
    });
    expect(JSON.stringify(event)).not.toContain("+14155552671");
  });

  it.each(["STOP", " stop ", "StopAll", "unsubscribe", "CANCEL", "end", "QUIT"])(
    "recognizes opt-out keyword %s",
    (body) => expect(isSmsOptOutKeyword(body)).toBe(true),
  );

  it.each(["START", "HELP", "hello"])("ignores conversation %s", (body) => {
    expect(isSmsOptOutKeyword(body)).toBe(false);
  });

  it("accepts an officially signed callback", async () => {
    const authToken = "test-auth-token";
    const url = "https://audienceown.example/api/webhooks/sms/twilio";
    const params = { MessageSid: "SM123", MessageStatus: "delivered" };
    const signature = twilio.getExpectedTwilioSignature(authToken, url, params);
    const applied: unknown[] = [];
    const response = await handleTwilioStatusWebhook(new Request(url, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-twilio-signature": signature,
      },
      body: new URLSearchParams(params),
    }), {
      authToken,
      webhookUrl: url,
      async apply(event) {
        applied.push(event);
      },
    });
    expect(response.status).toBe(204);
    expect(applied).toHaveLength(1);
  });

  it.each([
    ["", 401],
    ["forged", 401],
  ])("rejects invalid signature %s", async (signature, status) => {
    const url = "https://audienceown.example/api/webhooks/sms/twilio";
    const response = await handleTwilioStatusWebhook(new Request(url, {
      method: "POST",
      headers: { "x-twilio-signature": signature },
      body: "MessageSid=SM123&MessageStatus=delivered",
    }), {
      authToken: "test-auth-token",
      webhookUrl: url,
      async apply() {},
    });
    expect(response.status).toBe(status);
  });

  it.each([
    "http://audienceown.example/api/webhooks/sms/twilio",
    "https://wrong.example/api/webhooks/sms/twilio",
    "https://audienceown.example/api/webhooks/sms/other",
  ])("rejects a signature produced for altered URL %s", async (signedUrl) => {
    const authToken = "test-auth-token";
    const canonicalUrl = "https://audienceown.example/api/webhooks/sms/twilio";
    const params = { MessageSid: "SM123", MessageStatus: "delivered" };
    const signature = twilio.getExpectedTwilioSignature(authToken, signedUrl, params);
    const response = await handleTwilioStatusWebhook(new Request(canonicalUrl, {
      method: "POST",
      headers: {
        "x-twilio-signature": signature,
        "x-forwarded-host": "wrong.example",
        "x-forwarded-proto": "http",
      },
      body: new URLSearchParams(params),
    }), {
      authToken,
      webhookUrl: canonicalUrl,
      async apply() {},
    });
    expect(response.status).toBe(401);
  });

  it("rejects altered and duplicate form parameters", async () => {
    const authToken = "test-auth-token";
    const url = "https://audienceown.example/api/webhooks/sms/twilio";
    const signed = { MessageSid: "SM123", MessageStatus: "delivered" };
    const signature = twilio.getExpectedTwilioSignature(authToken, url, signed);
    const altered = await handleTwilioStatusWebhook(new Request(url, {
      method: "POST",
      headers: { "x-twilio-signature": signature },
      body: "MessageSid=SM123&MessageStatus=failed",
    }), { authToken, webhookUrl: url, async apply() {} });
    expect(altered.status).toBe(401);

    const duplicate = await handleTwilioStatusWebhook(new Request(url, {
      method: "POST",
      headers: { "x-twilio-signature": signature },
      body: "MessageSid=SM123&MessageStatus=delivered&MessageStatus=failed",
    }), { authToken, webhookUrl: url, async apply() {} });
    expect(duplicate.status).toBe(400);
  });

  it("returns retryable 503 for temporary application failure", async () => {
    const authToken = "test-auth-token";
    const url = "https://audienceown.example/api/webhooks/sms/twilio";
    const params = { MessageSid: "SM123", MessageStatus: "delivered" };
    const signature = twilio.getExpectedTwilioSignature(authToken, url, params);
    const response = await handleTwilioStatusWebhook(new Request(url, {
      method: "POST",
      headers: { "x-twilio-signature": signature },
      body: new URLSearchParams(params),
    }), {
      authToken,
      webhookUrl: url,
      async apply() {
        throw new Error("database unavailable");
      },
    });
    expect(response.status).toBe(503);
    await expect(response.text()).resolves.not.toContain("database unavailable");
  });

  it("applies a signed STOP without retaining arbitrary inbound content", async () => {
    const authToken = "test-auth-token";
    const url = "https://audienceown.example/api/webhooks/sms/twilio/inbound";
    const params = { From: "+14155552671", Body: " stop " };
    const signature = twilio.getExpectedTwilioSignature(authToken, url, params);
    const optedOut: string[] = [];
    const response = await handleTwilioInboundWebhook(new Request(url, {
      method: "POST",
      headers: { "x-twilio-signature": signature },
      body: new URLSearchParams(params),
    }), {
      authToken,
      webhookUrl: url,
      normalizeDestination: (value) => value,
      async optOut(destination) {
        optedOut.push(destination);
      },
    });
    expect(response.status).toBe(200);
    expect(optedOut).toEqual(["+14155552671"]);
  });

  it("acknowledges signed non-opt-out conversation without storing it", async () => {
    const authToken = "test-auth-token";
    const url = "https://audienceown.example/api/webhooks/sms/twilio/inbound";
    const params = { From: "+14155552671", Body: "hello" };
    const signature = twilio.getExpectedTwilioSignature(authToken, url, params);
    let called = false;
    const response = await handleTwilioInboundWebhook(new Request(url, {
      method: "POST",
      headers: { "x-twilio-signature": signature },
      body: new URLSearchParams(params),
    }), {
      authToken,
      webhookUrl: url,
      normalizeDestination: (value) => value,
      async optOut() {
        called = true;
      },
    });
    expect(response.status).toBe(200);
    expect(called).toBe(false);
  });
});

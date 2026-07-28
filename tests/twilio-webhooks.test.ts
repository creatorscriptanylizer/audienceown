import { describe, expect, it } from "vitest";
import twilio from "twilio";
import {
  isSmsOptOutKeyword,
  normalizeTwilioStatus,
} from "@/lib/delivery-webhooks/twilio";
import { handleTwilioStatusWebhook } from "@/lib/delivery-webhooks/twilio-handler";

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
});

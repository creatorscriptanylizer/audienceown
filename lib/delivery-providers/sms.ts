import "server-only";

import twilio from "twilio";
import { createSmsProvider } from "@/lib/delivery-providers/sms-provider";

export function createConfiguredSmsProvider() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!accountSid || !authToken || !messagingServiceSid) return createSmsProvider(null);
  const client = twilio(accountSid, authToken);
  return createSmsProvider(async (input) => {
    try {
      const result = await client.messages.create({
        to: input.to,
        body: input.body,
        messagingServiceSid,
        statusCallback: input.statusCallback,
      });
      return { sid: result.sid };
    } catch (error) {
      const candidate = error as { code?: number; status?: number; name?: string };
      return { error: {
        code: candidate.code,
        status: candidate.status,
        name: candidate.name,
      } };
    }
  });
}

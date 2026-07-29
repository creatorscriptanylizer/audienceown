import "server-only";

import twilio from "twilio";
import { createWhatsAppProvider } from "@/lib/delivery-providers/whatsapp-provider";
import { whatsappReadiness } from "@/lib/whatsapp-readiness";

export function createConfiguredWhatsAppProvider() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_SENDER;
  const contentSid = process.env.TWILIO_WHATSAPP_RECOVERY_CONTENT_SID;
  if (whatsappReadiness().outbound !== "configured"
    || !accountSid || !authToken || !from || !contentSid) {
    return createWhatsAppProvider(null);
  }
  const client = twilio(accountSid, authToken);
  return createWhatsAppProvider({
    from,
    contentSid,
    async sender(input) {
      try {
        const result = await client.messages.create(input);
        return { sid: result.sid };
      } catch (error) {
        const candidate = error as { code?: number; status?: number; name?: string };
        return { error: { code: candidate.code, status: candidate.status, name: candidate.name } };
      }
    },
  });
}

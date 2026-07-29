import { createHash } from "node:crypto";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { createAdminClient } from "@/lib/supabase/admin";
import { isWhatsAppOptOutKeyword } from "@/lib/delivery-webhooks/twilio";
import { handleTwilioInboundWebhook } from "@/lib/delivery-webhooks/twilio-inbound-handler";
import { canonicalAppUrl } from "@/lib/sms-readiness";

export async function POST(request: Request) {
  const appUrl = canonicalAppUrl();
  if (!appUrl) return new Response("Webhook unavailable", { status: 503 });
  return handleTwilioInboundWebhook(request, {
    authToken: process.env.TWILIO_AUTH_TOKEN,
    webhookUrl: `${appUrl}/api/webhooks/whatsapp/twilio/inbound`,
    isOptOut: isWhatsAppOptOutKeyword,
    normalizeDestination(value) {
      const raw = value.startsWith("whatsapp:") ? value.slice(9) : value;
      const phone = parsePhoneNumberFromString(raw);
      return phone?.isValid() ? phone.number : null;
    },
    async optOut(destination) {
      const destinationHash = createHash("sha256").update(destination).digest("hex");
      const admin = createAdminClient();
      if (!admin) throw new Error("database unavailable");
      const { error } = await admin.rpc("opt_out_whatsapp_recovery_method", {
        p_destination_hash: destinationHash,
        p_reason: "provider_stop",
      });
      if (error) throw new Error("opt-out unavailable");
    },
  });
}

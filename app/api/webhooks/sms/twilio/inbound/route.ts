import { createHash } from "node:crypto";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  formParams,
  isSmsOptOutKeyword,
  verifyTwilioSignature,
} from "@/lib/delivery-webhooks/twilio";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-twilio-signature") ?? "";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const url = `${appUrl}/api/webhooks/sms/twilio/inbound`;
  const params = formParams(rawBody);
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken || !signature
    || !verifyTwilioSignature(authToken, signature, url, params)) {
    return new Response("Invalid signature", { status: 401 });
  }
  if (!isSmsOptOutKeyword(params.Body ?? "")) {
    return new Response("<Response/>", {
      status: 200,
      headers: { "content-type": "text/xml" },
    });
  }
  const phone = parsePhoneNumberFromString(params.From ?? "");
  if (!phone?.isValid()) return new Response("Malformed callback", { status: 400 });
  const destinationHash = createHash("sha256").update(phone.number).digest("hex");
  const admin = createAdminClient();
  if (!admin) return new Response("Temporarily unavailable", { status: 503 });
  const { error } = await admin.rpc("opt_out_sms_recovery_method", {
    p_destination_hash: destinationHash,
    p_reason: "provider_stop",
  });
  if (error) return new Response("Temporarily unavailable", { status: 503 });
  return new Response("<Response/>", {
    status: 200,
    headers: { "content-type": "text/xml" },
  });
}

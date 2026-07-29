import {
  formParams,
  normalizeTwilioStatus,
  verifyTwilioSignature,
} from "@/lib/delivery-webhooks/twilio";

type Dependencies = {
  authToken?: string;
  webhookUrl: string;
  provider?: "twilio" | "twilio-whatsapp";
  apply(event: NonNullable<ReturnType<typeof normalizeTwilioStatus>>): Promise<void>;
};

export async function handleTwilioStatusWebhook(
  request: Request,
  dependencies: Dependencies,
) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-twilio-signature") ?? "";
  const params = formParams(rawBody);
  if (!params) return new Response("Malformed callback", { status: 400 });
  if (!dependencies.authToken || !signature) {
    return new Response("Invalid signature", { status: 401 });
  }
  if (!verifyTwilioSignature(
    dependencies.authToken,
    signature,
    dependencies.webhookUrl,
    params,
  )) {
    return new Response("Invalid signature", { status: 401 });
  }
  const event = normalizeTwilioStatus(params, dependencies.provider);
  if (!event) return new Response("Malformed callback", { status: 400 });
  console.info(JSON.stringify({
    event: "provider_callback_received",
    provider: event.provider,
    provider_message_id: event.providerMessageId,
    event_type: event.rawStatus,
    status: event.normalizedStatus,
  }));
  try {
    await dependencies.apply(event);
  } catch {
    return new Response("Temporarily unavailable", { status: 503 });
  }
  return new Response(null, { status: 204 });
}

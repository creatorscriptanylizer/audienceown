import {
  formParams,
  isSmsOptOutKeyword,
  verifyTwilioSignature,
} from "@/lib/delivery-webhooks/twilio";

type Dependencies = {
  authToken?: string;
  webhookUrl: string;
  normalizeDestination(value: string): string | null;
  optOut(destination: string): Promise<void>;
  isOptOut?: (body: string) => boolean;
};

const twiml = () => new Response("<Response/>", {
  status: 200,
  headers: { "content-type": "text/xml" },
});

export async function handleTwilioInboundWebhook(
  request: Request,
  dependencies: Dependencies,
) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-twilio-signature") ?? "";
  const params = formParams(rawBody);
  if (!params) return new Response("Malformed callback", { status: 400 });
  if (!dependencies.authToken || !signature
    || !verifyTwilioSignature(
      dependencies.authToken,
      signature,
      dependencies.webhookUrl,
      params,
    )) {
    return new Response("Invalid signature", { status: 401 });
  }
  if (!(dependencies.isOptOut ?? isSmsOptOutKeyword)(params.Body ?? "")) return twiml();
  const destination = dependencies.normalizeDestination(params.From ?? "");
  if (!destination) return new Response("Malformed callback", { status: 400 });
  try {
    await dependencies.optOut(destination);
  } catch {
    return new Response("Temporarily unavailable", { status: 503 });
  }
  return twiml();
}

import type { WebhookEventPayload } from "resend";
import {
  minimalResendEventPayload,
  normalizeResendEvent,
  type ResendWebhookHeaders,
} from "@/lib/delivery-webhooks/resend";

type Dependencies = {
  webhookSecret: string | undefined;
  verify(rawBody: string, headers: ResendWebhookHeaders, secret: string): WebhookEventPayload;
  apply(event: ReturnType<typeof normalizeResendEvent>): Promise<void>;
};

export async function handleResendWebhook(request: Request, dependencies: Dependencies) {
  const rawBody = await request.text();
  const headers = {
    id: request.headers.get("svix-id") ?? "",
    timestamp: request.headers.get("svix-timestamp") ?? "",
    signature: request.headers.get("svix-signature") ?? "",
  };
  if (!dependencies.webhookSecret || !headers.id || !headers.timestamp || !headers.signature) {
    return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let verified: WebhookEventPayload;
  try {
    verified = dependencies.verify(rawBody, headers, dependencies.webhookSecret);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Malformed webhook payload." }, { status: 400 });
    }
    return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const event = normalizeResendEvent(verified, headers.id);
  try {
    await dependencies.apply(event);
  } catch {
    return Response.json({ error: "Webhook processing is temporarily unavailable." }, { status: 503 });
  }
  return Response.json({
    received: true,
    providerEventId: event.providerEventId,
    type: event.type,
  });
}

export { minimalResendEventPayload };

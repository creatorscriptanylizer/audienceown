/* eslint-disable @typescript-eslint/no-unused-expressions -- compact retry counter branch */
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { canonicalize } from "@/lib/authenticity/canonical";
import { boundedNetworkFetch, decryptWebhookSecret, webhookSignature } from "@/lib/authenticity/network-security";
import { webhookRetry } from "@/lib/authenticity/webhook-retry";

function authorized(request: Request) { const expected = process.env.AUTHENTICITY_WEBHOOK_WORKER_SECRET, actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""); return Boolean(expected && actual && expected.length === actual.length && timingSafeEqual(Buffer.from(expected), Buffer.from(actual))); }
const unavailable = () => Response.json({ error: "Temporarily unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = createAdminClient(); if (!db) return unavailable();
  const batch = Math.min(100, Math.max(1, Number(process.env.AUTHENTICITY_WEBHOOK_BATCH_SIZE ?? 20) || 20)), owner = crypto.randomUUID();
  const { data: jobs, error } = await db.rpc("claim_authenticity_network_deliveries", { p_limit: batch, p_lease_owner: owner });
  if (error) return unavailable();
  let delivered = 0, retrying = 0, failed = 0;
  for (const job of jobs ?? []) {
    const { data: subscription, error: subscriptionError } = await db.from("authenticity_network_subscriptions").select("endpoint_url,secret_ciphertext,status,failure_count").eq("id", job.subscription_id).maybeSingle();
    if (subscriptionError) return unavailable();
    if (!subscription || !["active", "failing"].includes(subscription.status)) {
      const { error: cancelError } = await db.from("authenticity_network_deliveries").update({ status: "cancelled", lease_owner: null, lease_expires_at: null }).eq("id", job.id);
      if (cancelError) return unavailable();
      continue;
    }
    let responseStatus: number | undefined;
    try {
      const body = canonicalize(job.payload), timestamp = new Date().toISOString(), secret = decryptWebhookSecret(subscription.secret_ciphertext);
      const result = await boundedNetworkFetch(new URL(subscription.endpoint_url), { method: "POST", headers: { "content-type": "application/json", "x-audienceown-event-id": job.event_id, "x-audienceown-timestamp": timestamp, "x-audienceown-signature": webhookSignature(secret, job.event_id, timestamp, body) }, body }, { timeoutMs: Number(process.env.AUTHENTICITY_WEBHOOK_TIMEOUT_MS ?? 5000), maxBytes: Number(process.env.AUTHENTICITY_WEBHOOK_MAX_RESPONSE_BYTES ?? 16384) });
      responseStatus = result.response.status; if (!result.response.ok) throw new Error("delivery rejected");
      const [{ error: deliveryError }, { error: subscriptionUpdateError }] = await Promise.all([
        db.from("authenticity_network_deliveries").update({ status: "delivered", response_status: responseStatus, delivered_at: new Date().toISOString(), lease_owner: null, lease_expires_at: null }).eq("id", job.id),
        db.from("authenticity_network_subscriptions").update({ status: "active", failure_count: 0, last_success_at: new Date().toISOString(), next_attempt_at: null }).eq("id", job.subscription_id),
      ]);
      if (deliveryError || subscriptionUpdateError) throw deliveryError ?? subscriptionUpdateError;
      delivered++;
    } catch {
      const max = Math.min(20, Math.max(1, Number(process.env.AUTHENTICITY_WEBHOOK_MAX_ATTEMPTS ?? 6) || 6)), state = webhookRetry(job.attempt_count, max, responseStatus), next = new Date(Date.now() + Math.min(3_600_000, 2 ** job.attempt_count * 30_000)).toISOString();
      const [{ error: deliveryError }, { error: subscriptionUpdateError }] = await Promise.all([
        db.from("authenticity_network_deliveries").update({ status: state, response_status: responseStatus ?? null, next_attempt_at: state === "retrying" ? next : null, failed_at: state === "failed" ? new Date().toISOString() : null, lease_owner: null, lease_expires_at: null }).eq("id", job.id),
        db.from("authenticity_network_subscriptions").update({ status: state === "failed" ? "failing" : subscription.status, failure_count: subscription.failure_count + 1, last_failure_at: new Date().toISOString(), next_attempt_at: state === "retrying" ? next : null }).eq("id", job.subscription_id),
      ]);
      if (deliveryError || subscriptionUpdateError) return unavailable();
      state === "retrying" ? retrying++ : failed++;
    }
  }
  return Response.json({ claimed: jobs?.length ?? 0, delivered, retrying, failed }, { headers: { "cache-control": "no-store" } });
}

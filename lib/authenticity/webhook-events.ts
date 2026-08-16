import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { canonicalize } from "./canonical";
import { publicBaseUrl } from "./public";

export async function queueAuthenticityNetworkEvent(db: SupabaseClient<Database>, creatorId: string, slug: string, eventType: string, eventId: string, links: Record<string, string>) {
  const { data: subscriptions, error: subscriptionsError } = await db.from("authenticity_network_subscriptions").select("id").eq("creator_id", creatorId).eq("status", "active").contains("event_types", [eventType]);
  if (subscriptionsError) throw subscriptionsError;
  const payload = { version: "audienceown-webhook-v1", eventId, eventType, occurredAt: new Date().toISOString(), creator: { slug }, links: Object.fromEntries(Object.entries(links).map(([key, value]) => [key, new URL(value, publicBaseUrl()).toString()])) };
  const payloadHash = createHash("sha256").update(canonicalize(payload)).digest("hex");
  if (subscriptions?.length) {
    const { error: deliveriesError } = await db.from("authenticity_network_deliveries").upsert(subscriptions.map((subscription) => ({ subscription_id: subscription.id, event_id: eventId, event_type: eventType, payload: payload as Json, payload_hash: payloadHash, status: "queued" as const })), { onConflict: "subscription_id,event_id", ignoreDuplicates: true });
    if (deliveriesError) throw deliveriesError;
  }
  return subscriptions?.length ?? 0;
}

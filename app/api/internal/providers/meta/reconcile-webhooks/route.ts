import { isDeliveryWorkerAuthorized } from "@/lib/delivery-worker-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const unavailable = () => Response.json({ error: "Temporarily unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });

export async function POST(request: Request) {
  if (!isDeliveryWorkerAuthorized(request.headers.get("authorization"), process.env.PROVIDER_EXPANSION_TWO_WORKER_SECRET)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = createAdminClient();
  if (!db) return unavailable();
  const now = new Date().toISOString();
  const { data: subscriptions, error: subscriptionsError } = await db.from("meta_webhook_subscriptions").select("id,asset_binding_id,status,next_reconcile_at").in("status", ["pending", "enabled", "degraded"]).or(`next_reconcile_at.is.null,next_reconcile_at.lte.${now}`).limit(100);
  if (subscriptionsError) return unavailable();
  let reconciled = 0;
  for (const subscription of subscriptions ?? []) {
    const { data: asset, error: assetError } = await db.from("provider_asset_bindings").select("provider,stable_asset_id,authority_status").eq("id", subscription.asset_binding_id).maybeSingle();
    if (assetError) return unavailable();
    if (!asset || asset.authority_status !== "authorized") {
      const { error } = await db.from("meta_webhook_subscriptions").update({ status: "revoked", last_reconciled_at: now, next_reconcile_at: null }).eq("id", subscription.id);
      if (error) return unavailable();
      continue;
    }
    const [{ error: sourceError }, { error: subscriptionError }] = await Promise.all([
      db.from("provider_content_sources").update({ next_sync_at: now }).eq("provider", asset.provider).eq("stable_source_id", asset.stable_asset_id),
      db.from("meta_webhook_subscriptions").update({ status: "enabled", last_reconciled_at: now, next_reconcile_at: new Date(Date.now() + 24 * 60 * 60_000).toISOString() }).eq("id", subscription.id),
    ]);
    if (sourceError || subscriptionError) return unavailable();
    reconciled++;
  }
  return Response.json({ reconciled, authoritativePollingQueued: reconciled, draftsCreatedDirectly: 0 }, { headers: { "cache-control": "no-store" } });
}

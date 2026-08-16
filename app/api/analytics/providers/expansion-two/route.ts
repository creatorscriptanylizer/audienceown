import { getCreator } from "@/lib/dal";
import { providerAnalyticsUnavailable } from "@/lib/provider-analytics-api";
import { createClient } from "@/lib/supabase/server";

const ROUTE = "provider_analytics_expansion_two";
const providers = ["tiktok", "instagram", "facebook"] as const;

export async function GET() {
  const creator = await getCreator();
  const db = await createClient();
  if (!creator) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return providerAnalyticsUnavailable(ROUTE, "database_client");
  const [detectionsResult, updatesResult, connectionsResult, assetsResult] = await Promise.all([
    db.from("social_detection_events").select("provider,detection_source,detected_at").eq("creator_id", creator.id).in("provider", providers),
    db.from("creator_updates").select("source_provider,status").eq("creator_id", creator.id).in("source_provider", providers),
    db.from("connected_accounts").select("platform,connection_health,last_sync_at,provider_status").eq("creator_id", creator.id).in("platform", providers),
    db.from("provider_asset_bindings").select("provider,last_successful_sync_at").eq("creator_id", creator.id),
  ]);
  if (detectionsResult.error) return providerAnalyticsUnavailable(ROUTE, "social_detection_events", detectionsResult.error);
  if (updatesResult.error) return providerAnalyticsUnavailable(ROUTE, "creator_updates", updatesResult.error);
  if (connectionsResult.error) return providerAnalyticsUnavailable(ROUTE, "connected_accounts", connectionsResult.error);
  if (assetsResult.error) return providerAnalyticsUnavailable(ROUTE, "provider_asset_bindings", assetsResult.error);

  const detections = detectionsResult.data ?? [];
  const updates = updatesResult.data ?? [];
  const connections = connectionsResult.data ?? [];
  const assets = assetsResult.data ?? [];
  return Response.json({ providers: Object.fromEntries(providers.map((provider) => {
    const detected = detections.filter((item) => item.provider === provider);
    const drafts = updates.filter((item) => item.source_provider === provider);
    return [provider, {
      detected: detected.length, automatic: detected.filter((item) => item.detection_source !== "manual_provider_import").length,
      manual: detected.filter((item) => item.detection_source === "manual_provider_import").length,
      draftsGenerated: drafts.length, published: drafts.filter((item) => item.status === "sent").length,
      connectionHealth: connections.find((item) => item.platform === provider)?.connection_health ?? "not_connected",
      assets: assets.filter((item) => item.provider === provider).length,
      lastSync: assets.filter((item) => item.provider === provider).map((item) => item.last_successful_sync_at).filter(Boolean).sort().at(-1) ?? null,
    }];
  })) }, { headers: { "cache-control": "private, no-store" } });
}

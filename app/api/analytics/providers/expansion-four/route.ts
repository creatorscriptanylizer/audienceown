import { getCreator } from "@/lib/dal";
import { providerAnalyticsUnavailable } from "@/lib/provider-analytics-api";
import { createClient } from "@/lib/supabase/server";

const ROUTE = "provider_analytics_expansion_four";
const providers = ["spotify", "snapchat", "pinterest"] as const;

export async function GET() {
  const creator = await getCreator();
  const db = await createClient();
  if (!creator) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return providerAnalyticsUnavailable(ROUTE, "database_client");
  const [detectionsResult, updatesResult, accountsResult, manualResult] = await Promise.all([
    db.from("social_detection_events").select("provider,detection_source").eq("creator_id", creator.id).in("provider", providers),
    db.from("creator_updates").select("source_provider,status").eq("creator_id", creator.id).in("source_provider", providers),
    db.from("connected_accounts").select("platform,connection_health,last_sync_at").eq("creator_id", creator.id).in("platform", providers),
    db.from("manual_service_connections").select("verification_status").eq("creator_id", creator.id),
  ]);
  if (detectionsResult.error) return providerAnalyticsUnavailable(ROUTE, "social_detection_events", detectionsResult.error);
  if (updatesResult.error) return providerAnalyticsUnavailable(ROUTE, "creator_updates", updatesResult.error);
  if (accountsResult.error) return providerAnalyticsUnavailable(ROUTE, "connected_accounts", accountsResult.error);
  if (manualResult.error) return providerAnalyticsUnavailable(ROUTE, "manual_service_connections", manualResult.error);

  const detections = detectionsResult.data ?? [];
  const updates = updatesResult.data ?? [];
  const accounts = accountsResult.data ?? [];
  const manual = manualResult.data ?? [];
  return Response.json({
    providers: Object.fromEntries(providers.map((provider) => [provider, {
      detected: detections.filter((item) => item.provider === provider).length,
      manualImports: detections.filter((item) => item.provider === provider && item.detection_source === "manual_provider_import").length,
      draftsGenerated: updates.filter((item) => item.source_provider === provider).length,
      approvedOrPublished: updates.filter((item) => item.source_provider === provider && item.status !== "draft").length,
      connectionHealth: accounts.find((item) => item.platform === provider)?.connection_health ?? "not_connected",
      lastSync: accounts.filter((item) => item.platform === provider).map((item) => item.last_sync_at).filter(Boolean).sort().at(-1) ?? null,
    }])),
    verifiedManualServices: manual.filter((item) => item.verification_status === "verified").length,
    audienceAnalyticsIncluded: false,
  }, { headers: { "cache-control": "private, no-store" } });
}

import { requireCreator } from "@/lib/dal";
import { providerAnalyticsUnavailable } from "@/lib/provider-analytics-api";
import { createClient } from "@/lib/supabase/server";

const ROUTE = "provider_analytics_expansion_one";
const providers = ["twitch", "discord", "podcast", "rss"];

export async function GET() {
  const creator = await requireCreator();
  const db = await createClient();
  if (!db) return providerAnalyticsUnavailable(ROUTE, "database_client");
  const [detectionsResult, draftsResult, sourcesResult] = await Promise.all([
    db.from("social_detection_events").select("provider,detection_source,processing_status").eq("creator_id", creator.id).in("provider", providers),
    db.from("creator_updates").select("source_provider,status").eq("creator_id", creator.id).in("source_provider", providers),
    db.from("provider_content_sources").select("provider,verification_state,last_successful_sync_at,configuration").eq("creator_id", creator.id),
  ]);
  if (detectionsResult.error) return providerAnalyticsUnavailable(ROUTE, "social_detection_events", detectionsResult.error);
  if (draftsResult.error) return providerAnalyticsUnavailable(ROUTE, "creator_updates", draftsResult.error);
  if (sourcesResult.error) return providerAnalyticsUnavailable(ROUTE, "provider_content_sources", sourcesResult.error);

  const detections = detectionsResult.data ?? [];
  const drafts = draftsResult.data ?? [];
  const sources = sourcesResult.data ?? [];
  const count = (provider: string) => detections.filter((item) => item.provider === provider).length;
  return Response.json({
    twitchEvents: count("twitch"), discordAnnouncements: count("discord"),
    podcastEpisodes: count("podcast") + count("rss"),
    draftsGenerated: drafts.filter((item) => item.status === "draft").length,
    approvals: drafts.filter((item) => ["scheduled", "queued", "sending", "sent"].includes(item.status)).length,
    publications: drafts.filter((item) => item.status === "sent").length,
    manualDetections: detections.filter((item) => item.detection_source === "manual_provider_import").length,
    automaticDetections: detections.filter((item) => item.detection_source !== "manual_provider_import").length,
    sources,
  }, { headers: { "cache-control": "private, no-store" } });
}

import { analyticsError, privateAnalyticsJson, requireAnalyticsCreator } from "@/lib/recovery-analytics-api";
import { liveRecoveryAnalytics } from "@/lib/recovery-analytics-server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAnalyticsCreator();
  if (access.error) return access.error;
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) return analyticsError("invalid_incident_id", 400);
  try { return privateAnalyticsJson(await liveRecoveryAnalytics(id)); }
  catch (error) { return analyticsError(error instanceof Error && error.message === "not_found" ? "not_found" : "analytics_unavailable", error instanceof Error && error.message === "not_found" ? 404 : 503); }
}

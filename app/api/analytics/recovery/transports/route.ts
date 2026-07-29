import { analyticsError, privateAnalyticsJson, requireAnalyticsCreator } from "@/lib/recovery-analytics-api";
import { recoveryTransportBreakdown } from "@/lib/recovery-analytics-server";

export async function GET() {
  const access = await requireAnalyticsCreator();
  if (access.error) return access.error;
  try {
    return privateAnalyticsJson(await recoveryTransportBreakdown());
  } catch {
    return analyticsError("analytics_unavailable", 503);
  }
}

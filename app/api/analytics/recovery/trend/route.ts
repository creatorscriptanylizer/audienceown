import { analyticsError, privateAnalyticsJson, requireAnalyticsCreator } from "@/lib/recovery-analytics-api";
import { recoveryTrend } from "@/lib/recovery-analytics-server";

export async function GET(request: Request) {
  const access = await requireAnalyticsCreator();
  if (access.error) return access.error;
  const days = Number(new URL(request.url).searchParams.get("days") ?? 30);
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    return analyticsError("invalid_date_range", 400);
  }
  try {
    return privateAnalyticsJson(await recoveryTrend(days));
  } catch {
    return analyticsError("analytics_unavailable", 503);
  }
}

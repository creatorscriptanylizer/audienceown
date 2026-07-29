import { analyticsError, privateAnalyticsJson, requireAnalyticsCreator } from "@/lib/recovery-analytics-api";
import { recoveryUpdates } from "@/lib/recovery-analytics-server";

export async function GET(request: Request) {
  const access = await requireAnalyticsCreator();
  if (access.error) return access.error;
  const params = new URL(request.url).searchParams;
  const limit = Number(params.get("limit") ?? 20);
  const before = params.get("before");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return analyticsError("invalid_limit", 400);
  }
  if (before && Number.isNaN(Date.parse(before))) {
    return analyticsError("invalid_cursor", 400);
  }
  try {
    return privateAnalyticsJson(await recoveryUpdates(limit, before));
  } catch {
    return analyticsError("analytics_unavailable", 503);
  }
}

import { analyticsError, privateAnalyticsJson, requireAnalyticsCreator } from "@/lib/recovery-analytics-api";
import { recoveryUpdate } from "@/lib/recovery-analytics-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireAnalyticsCreator();
  if (access.error) return access.error;
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) {
    return analyticsError("invalid_update_id", 400);
  }
  try {
    const result = await recoveryUpdate(id);
    if (result.status === "unavailable") return analyticsError("analytics_unavailable", 503);
    if (result.status === "absent") return analyticsError("not_found", 404);
    return privateAnalyticsJson(result.data);
  } catch {
    return analyticsError("analytics_unavailable", 503);
  }
}

import { createAdminClient } from "@/lib/supabase/admin";
import { isDeliveryWorkerAuthorized } from "@/lib/delivery-worker-auth";
import { providerAudienceCapabilities } from "@/lib/platform-audience/capabilities";

export async function GET(request: Request) {
  if (!isDeliveryWorkerAuthorized(request.headers.get("authorization"), process.env.PROVIDER_AUDIENCE_METRICS_WORKER_SECRET)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = createAdminClient();
  if (!db) return Response.json({ error: "Unavailable" }, { status: 503 });
  const [{ data: metrics }, { count: officialAccounts }] = await Promise.all([
    db.from("provider_audience_metrics").select("provider,status,next_sync_at,synchronized_at,last_success_at,lease_expires_at,consecutive_failures"),
    db.from("connected_accounts").select("id", { count: "exact", head: true }).eq("account_type", "official"),
  ]);
  const rows = metrics ?? [], now = new Date().toISOString();
  return Response.json({
    supportedProviders: Object.values(providerAudienceCapabilities).filter((item) => item.supported).map((item) => item.provider),
    officialAccountsConfigured: officialAccounts ?? 0,
    metricsAvailable: rows.filter((item) => item.status === "available").length,
    metricsStale: rows.filter((item) => item.status === "stale").length,
    reviewRequired: rows.filter((item) => item.status === "review_required").length,
    permissionRequired: rows.filter((item) => item.status === "permission_required").length,
    hiddenCounts: rows.filter((item) => item.status === "hidden").length,
    failedSynchronizations: rows.filter((item) => item.status === "error").length,
    metricsDue: rows.filter((item) => !item.next_sync_at || item.next_sync_at <= now).length,
    oldestSuccessfulSync: rows.map((item) => item.last_success_at).filter((item): item is string => Boolean(item)).sort()[0] ?? null,
    expiredFailedLeases: rows.filter((item) => item.lease_expires_at && item.lease_expires_at <= now && item.consecutive_failures > 0).length,
  }, { headers: { "cache-control": "no-store" } });
}

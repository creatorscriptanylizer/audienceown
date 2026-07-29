import { createAdminClient } from "@/lib/supabase/admin";
import {
  classifyDeliveryHealth,
  deliveryHealthThresholds,
  type DeliveryHealthMetrics,
} from "@/lib/delivery-health";
import { integrationStatus } from "@/lib/env";

export async function GET() {
  const admin = createAdminClient();
  if (!admin) {
    return Response.json({ status: "unhealthy" }, {
      status: 503, headers: { "cache-control": "no-store" },
    });
  }
  const result = await admin.rpc("get_delivery_system_health");
  if (result.error || !result.data) {
    return Response.json({ status: "unhealthy" }, {
      status: 503, headers: { "cache-control": "no-store" },
    });
  }
  const metrics = result.data as unknown as DeliveryHealthMetrics & Record<string, number>;
  const integrations = integrationStatus();
  return Response.json({
    status: classifyDeliveryHealth(metrics, deliveryHealthThresholds()),
    queueDepth: metrics.queuedCount,
    stuckDeliveries: metrics.stuckSendingCount,
    retryableFailures: metrics.retryableFailedCount,
    pendingCallbacks: metrics.pendingCallbackCount,
    oldestQueuedSeconds: metrics.oldestQueuedSeconds,
    providers: {
      resend: integrations.resend ? "available" : "unavailable",
      "web-push": integrations.browserPush ? "available" : "unavailable",
      twilio: integrations.sms ? "available" : "unavailable",
      "twilio-whatsapp": integrations.whatsapp ? "available" : "unavailable",
    },
  }, { headers: { "cache-control": "no-store" } });
}

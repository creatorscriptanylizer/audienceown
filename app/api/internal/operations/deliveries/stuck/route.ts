import { createAdminClient } from "@/lib/supabase/admin";
import { getDeliveryOperator } from "@/lib/delivery-operator-auth";
import { parseBoundedLimit } from "@/lib/delivery-operations";
import { operationsError } from "@/lib/delivery-operations-api";

export async function GET(request: Request) {
  if (!await getDeliveryOperator()) return operationsError("operator_required", 403);
  const limit = parseBoundedLimit(new URL(request.url).searchParams.get("limit"));
  if (!limit) return operationsError("invalid_limit", 400);
  const admin = createAdminClient();
  if (!admin) return operationsError("operations_unavailable", 503);
  const result = await admin.rpc("get_stuck_deliveries", { p_limit: limit });
  return result.error
    ? operationsError("operations_unavailable", 503)
    : Response.json({ ok: true, deliveries: result.data }, { headers: { "cache-control": "no-store" } });
}

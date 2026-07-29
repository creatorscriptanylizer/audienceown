import { getDeliveryOperator } from "@/lib/delivery-operator-auth";
import { getOperationsOverview, parseBoundedLimit } from "@/lib/delivery-operations";
import { operationsError } from "@/lib/delivery-operations-api";

export async function GET(request: Request) {
  if (!await getDeliveryOperator()) return operationsError("operator_required", 403);
  const limit = parseBoundedLimit(new URL(request.url).searchParams.get("limit"));
  if (!limit) return operationsError("invalid_limit", 400);
  try {
    return Response.json({ ok: true, ...(await getOperationsOverview(limit)) }, {
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return operationsError("operations_unavailable", 503);
  }
}

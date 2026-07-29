import { getDeliveryOperator } from "@/lib/delivery-operator-auth";
import { getSafeDeliveryInspection } from "@/lib/delivery-operations";
import { operationsError } from "@/lib/delivery-operations-api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await getDeliveryOperator()) return operationsError("operator_required", 403);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return operationsError("invalid_delivery_id", 400);
  try {
    const delivery = await getSafeDeliveryInspection(id);
    return delivery
      ? Response.json({ ok: true, delivery }, { headers: { "cache-control": "no-store" } })
      : operationsError("not_found", 404);
  } catch {
    return operationsError("operations_unavailable", 503);
  }
}

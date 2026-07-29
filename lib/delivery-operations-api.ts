import "server-only";
import {
  getDeliveryOperator,
  isMutationOriginAllowed,
  takeOperatorMutationRateLimit,
} from "@/lib/delivery-operator-auth";
import { runOperatorAction } from "@/lib/delivery-operations";

export function operationsError(code: string, status: number) {
  return Response.json({ ok: false, error: { code } }, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function handleOperatorMutation(
  request: Request,
  action: "retry" | "release" | "reconcile",
) {
  const operator = await getDeliveryOperator();
  if (!operator) return operationsError("operator_required", 403);
  if (!isMutationOriginAllowed(request)) return operationsError("invalid_origin", 403);
  if (!takeOperatorMutationRateLimit(operator.userId)) {
    return operationsError("rate_limited", 429);
  }
  let body: { deliveryId?: unknown; eventId?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return operationsError("invalid_json", 400);
  }
  const targetId = action === "reconcile" ? body.eventId : body.deliveryId;
  if (typeof targetId !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId)) {
    return operationsError("invalid_target_id", 400);
  }
  if (typeof body.reason !== "string" || body.reason.trim().length < 3
    || body.reason.trim().length > 500) {
    return operationsError("reason_required", 400);
  }
  const result = await runOperatorAction(action, targetId, body.reason, operator);
  if (result.error) {
    const message = result.error.message.toLowerCase();
    const code = message.includes("not found") ? "not_found"
      : message.includes("permanent") ? "permanent_failure"
        : message.includes("exhausted") ? "attempts_exhausted"
          : message.includes("not stuck") ? "not_stuck"
            : message.includes("reconciliation") ? "reconciliation_required"
              : "action_rejected";
    return operationsError(code, code === "not_found" ? 404 : 409);
  }
  console.info(JSON.stringify({
    event: "manual_operator_action",
    action_type: action,
    target_id: targetId,
    actor_user_id: operator.userId,
    status: result.data,
  }));
  return Response.json({ ok: true, status: result.data }, {
    headers: { "cache-control": "no-store" },
  });
}

import { dispatchQueuedDeliveries, DELIVERY_MAX_BATCH_SIZE } from "@/lib/delivery-dispatch";
import { isDeliveryWorkerAuthorized } from "@/lib/delivery-worker-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isDeliveryWorkerAuthorized(
    request.headers.get("authorization"),
    process.env.DELIVERY_WORKER_SECRET,
  )) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let limit = 10;
  try {
    const body = await request.json() as { limit?: unknown };
    if (body.limit !== undefined) limit = Number(body.limit);
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > DELIVERY_MAX_BATCH_SIZE) {
    return Response.json(
      { error: `Limit must be between 1 and ${DELIVERY_MAX_BATCH_SIZE}` },
      { status: 400 },
    );
  }

  try {
    return Response.json(await dispatchQueuedDeliveries({ limit }), {
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return Response.json({ error: "Delivery batch failed" }, { status: 500 });
  }
}

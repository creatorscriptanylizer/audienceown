import { isDeliveryWorkerAuthorized } from "@/lib/delivery-worker-auth";
import { pollSocialConnections } from "@/lib/social-providers/polling";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!isDeliveryWorkerAuthorized(request.headers.get("authorization"), process.env.SOCIAL_WORKER_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  let limit = 10;
  try {
    const body = await request.json() as { limit?: unknown };
    if (body.limit !== undefined) limit = Number(body.limit);
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return Response.json({ error: "Limit must be between 1 and 100" }, { status: 400 });
  }
  try {
    return Response.json(await pollSocialConnections(limit), { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "YouTube poll failed" }, { status: 500 });
  }
}

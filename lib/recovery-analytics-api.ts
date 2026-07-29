import "server-only";
import { getCreator, getViewer } from "@/lib/dal";

export function analyticsError(code: string, status: number) {
  return Response.json({ ok: false, error: { code } }, {
    status,
    headers: { "cache-control": "private, no-store" },
  });
}

export async function requireAnalyticsCreator() {
  const viewer = await getViewer();
  if (!viewer) return { error: analyticsError("authentication_required", 401) };
  const creator = await getCreator();
  if (!creator) return { error: analyticsError("creator_required", 403) };
  return { creator };
}

export function privateAnalyticsJson(value: unknown) {
  return Response.json({ ok: true, data: value }, {
    headers: { "cache-control": "private, no-store" },
  });
}

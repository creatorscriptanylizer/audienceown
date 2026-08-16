import "server-only";

import { debugDatabaseError } from "@/lib/debug";

export function providerAnalyticsUnavailable(route: string, query: string, error?: unknown) {
  if (error !== undefined) {
    debugDatabaseError("read", query, error, {
      route,
      analyticsDomain: "provider_analytics",
      failureCategory: "query_failed",
    });
  }
  return Response.json(
    { error: "Temporarily unavailable" },
    { status: 503, headers: { "cache-control": "no-store" } },
  );
}

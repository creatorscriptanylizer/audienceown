import "server-only";

import { debugDatabaseError } from "@/lib/debug";
import { createAdminClient } from "@/lib/supabase/admin";

export function createPublicAuthenticityDatabase(route: string) {
  try {
    const data = createAdminClient();
    if (!data) throw new Error("Public database client unavailable");
    return { status: "available" as const, data };
  } catch (error) {
    return { status: "unavailable" as const, response: publicAuthenticityUnavailable(route, "database_client", error) };
  }
}

export function publicAuthenticityUnavailable(route: string, query: string, error?: unknown) {
  if (error !== undefined) {
    debugDatabaseError("read", query, error, { route, failureCategory: "query_failed" });
  }
  return Response.json(
    { error: "Temporarily unavailable" },
    { status: 503, headers: { "cache-control": "no-store" } },
  );
}

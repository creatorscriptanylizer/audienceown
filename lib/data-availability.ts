import "server-only";

import { debugDatabaseError } from "@/lib/debug";

export type DataAvailability =
  | { status: "available" }
  | { status: "unavailable"; reason: "query_failed" };

export const AVAILABLE: DataAvailability = { status: "available" };
export const QUERY_FAILED: DataAvailability = { status: "unavailable", reason: "query_failed" };

export function availabilityFromError(error: unknown): DataAvailability {
  return error ? QUERY_FAILED : AVAILABLE;
}

export function logPageQueryFailure(page: string, query: string, error: unknown) {
  if (!error) return;
  debugDatabaseError(query, page, error, { page, query, failureCategory: "query_failed" });
}

import "server-only";

import { debugDatabaseError } from "@/lib/debug";

export type DatabaseFailure = readonly [query: string, error: unknown];

export function apiUnavailable(route: string, query: string, error?: unknown) {
  if (error !== undefined) debugDatabaseError("read", query, error, { route, failureCategory: "query_failed" });
  return Response.json({ error: "Temporarily unavailable" }, {
    status: 503,
    headers: { "cache-control": "no-store" },
  });
}

export function firstDatabaseFailure(route: string, failures: readonly DatabaseFailure[]) {
  const failure = failures.find(([, error]) => Boolean(error));
  return failure ? apiUnavailable(route, failure[0], failure[1]) : null;
}

export function throwOnDatabaseFailure(query: string, error: unknown): asserts error is null | undefined {
  if (error) throw new Error(`${query}_unavailable`, { cause: error });
}

type QueryResult = { error: unknown };
export async function requiredQueryResults<T>(
  route: string,
  queries: readonly string[],
  promise: Promise<T>,
): Promise<{ response: Response; results: null } | { response: null; results: T }> {
  const results = await promise;
  const checked = results as unknown as readonly QueryResult[];
  const failure = checked.findIndex((result) => Boolean(result.error));
  if (failure >= 0) return { response: apiUnavailable(route, queries[failure] ?? "database_query", checked[failure].error), results: null };
  return { response: null, results };
}

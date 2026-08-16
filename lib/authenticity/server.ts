import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseAuthenticityRecord } from "./public";
import type { AuthenticityRecord } from "./types";
import { parsePublicEcosystemGraph } from "@/lib/ecosystem/public";
import { debugDatabaseError } from "@/lib/debug";

export type PublicAuthenticityResult =
  | { status: "available"; data: AuthenticityRecord }
  | { status: "absent"; data: null }
  | { status: "unavailable"; data: null };

export async function getPublicAuthenticity(slug: string): Promise<PublicAuthenticityResult> {
  const db = createAdminClient();
  if (!db) return { status: "unavailable", data: null };
  const [authenticityResult, ecosystemResult] = await Promise.all([
    db.rpc("get_public_creator_authenticity", { p_slug: slug }),
    db.rpc("get_public_creator_ecosystem_graph", { p_slug: slug }),
  ]);
  if (authenticityResult.error || ecosystemResult.error) {
    if (authenticityResult.error) debugDatabaseError("rpc", "get_public_creator_authenticity", authenticityResult.error, { failureCategory: "query_failed" });
    if (ecosystemResult.error) debugDatabaseError("rpc", "get_public_creator_ecosystem_graph", ecosystemResult.error, { failureCategory: "query_failed" });
    return { status: "unavailable", data: null };
  }
  const record = parseAuthenticityRecord(authenticityResult.data);
  if (!record) return { status: "absent", data: null };
  const ecosystem = parsePublicEcosystemGraph(ecosystemResult.data);
  return { status: "available", data: { ...record, ecosystem: ecosystem?.destinations ?? [] } };
}

export function authenticityCacheControl(record: AuthenticityRecord) {
  return record.authenticity.state === "verification_restricted"
    || record.authenticity.state === "emergency_recovery_active"
    ? "no-store"
    : "public, max-age=30, stale-while-revalidate=60";
}

export async function recordAuthenticityView(slug: string, kind: string) {
  const db = createAdminClient();
  if (db) await db.rpc("record_authenticity_view", { p_slug: slug, p_kind: kind });
}

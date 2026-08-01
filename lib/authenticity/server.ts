import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseAuthenticityRecord } from "./public";
import type { AuthenticityRecord } from "./types";

export async function getPublicAuthenticity(slug: string): Promise<AuthenticityRecord | null> {
  const db = createAdminClient();
  if (!db) return null;
  const { data, error } = await db.rpc("get_public_creator_authenticity", { p_slug: slug });
  if (error) return null;
  return parseAuthenticityRecord(data);
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

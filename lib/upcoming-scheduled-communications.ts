import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export const SCHEDULED_COMMUNICATION_SELECTION = "id,broadcast_type,broadcast_intent,status,title,subject,content,cta_url,scheduled_for,sent_at,queued_at,updated_at,affected_platform_connection_id,source_provider";

export async function getUpcomingScheduledCommunications(
  db: SupabaseClient<Database>,
  creatorId: string,
  now = new Date(),
  limit = 100,
) {
  const result = await db.from("creator_updates")
    .select(SCHEDULED_COMMUNICATION_SELECTION)
    .eq("creator_id", creatorId)
    .eq("status", "scheduled")
    .not("scheduled_for", "is", null)
    .gt("scheduled_for", now.toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(limit);
  if (result.error) throw result.error;
  return result.data ?? [];
}

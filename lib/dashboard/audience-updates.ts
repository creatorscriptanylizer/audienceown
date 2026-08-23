import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { BroadcastIntent } from "@/lib/broadcast-studio";
import type { BroadcastStatus, BroadcastType } from "@/lib/updates";
import { getUpcomingScheduledCommunications } from "@/lib/upcoming-scheduled-communications";

const SUCCESSFUL_SEND_STATUSES = ["accepted", "delivered", "bounced", "complained"] as const;
export const DASHBOARD_RECENT_BROADCAST_LIMIT = 3;

type UpdateRow = {
  id: string;
  broadcast_type: BroadcastType;
  broadcast_intent: BroadcastIntent;
  status: BroadcastStatus;
  title: string;
  scheduled_for: string | null;
  sent_at: string | null;
  queued_at: string | null;
  updated_at: string;
  affected_platform_connection_id: string | null;
  source_provider: string | null;
};

type DeliveryRow = {
  update_id: string;
  contact_id: string;
  transport: "email" | "sms" | "whatsapp" | "browser_notification";
  status: string;
  accepted_at: string | null;
  delivered_at: string | null;
};

export type AudienceUpdatesSummary = {
  periodDays: 30;
  updatesSent: number;
  audienceReached: number;
  openRate: null;
  clickRate: null;
  drafts: number;
  scheduled: number;
  nextScheduled: AudienceUpdateItem | null;
  recent: AudienceUpdateItem[];
  byPlatform: Array<{ provider: string; count: number }>;
};

export type AudienceUpdateItem = {
  id: string;
  title: string;
  broadcastType: BroadcastType;
  broadcastIntent: BroadcastIntent;
  sourcePlatform: string | null;
  deliveryChannels: Array<DeliveryRow["transport"]>;
  occurredAt: string;
  deliveredCount: number;
  wasSent: boolean;
  openRate: null;
  clickRate: null;
  status: BroadcastStatus;
};

export const emptyAudienceUpdatesSummary: AudienceUpdatesSummary = {
  periodDays: 30,
  updatesSent: 0,
  audienceReached: 0,
  openRate: null,
  clickRate: null,
  drafts: 0,
  scheduled: 0,
  nextScheduled: null,
  recent: [],
  byPlatform: [],
};

function itemFromRow(
  row: UpdateRow,
  deliveries: DeliveryRow[],
  platformByConnection: Map<string, string>,
): AudienceUpdateItem {
  const relevant = deliveries.filter((delivery) => delivery.update_id === row.id);
  const channels = [...new Set(relevant.map((delivery) => delivery.transport))];
  const deliveryActivity = relevant
    .map((delivery) => delivery.delivered_at ?? delivery.accepted_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  return {
    id: row.id,
    title: row.title || "Untitled update",
    broadcastType: row.broadcast_type,
    broadcastIntent: row.broadcast_intent,
    sourcePlatform: row.affected_platform_connection_id
      ? platformByConnection.get(row.affected_platform_connection_id) ?? null
      : row.source_provider,
    deliveryChannels: channels,
    occurredAt: row.sent_at ?? deliveryActivity ?? row.scheduled_for ?? row.queued_at ?? row.updated_at,
    deliveredCount: relevant.filter((delivery) => Boolean(delivery.delivered_at)).length,
    wasSent: relevant.some((delivery) => Boolean(delivery.accepted_at)),
    openRate: null,
    clickRate: null,
    status: row.status,
  };
}

export function buildAudienceUpdatesSummary(input: {
  now: Date;
  updates: UpdateRow[];
  recentUpdates?: UpdateRow[];
  upcomingScheduled?: UpdateRow[];
  deliveries: DeliveryRow[];
  platforms: Array<{ id: string; platform: string }>;
}) {
  const cutoff = new Date(input.now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const platformByConnection = new Map(input.platforms.map((row) => [row.id, row.platform]));
  const sentInPeriod = input.deliveries.filter((delivery) =>
    SUCCESSFUL_SEND_STATUSES.includes(delivery.status as (typeof SUCCESSFUL_SEND_STATUSES)[number])
    && Boolean(delivery.accepted_at && delivery.accepted_at >= cutoff),
  );
  const deliveredInPeriod = input.deliveries.filter((delivery) =>
    Boolean(delivery.delivered_at && delivery.delivered_at >= cutoff),
  );
  const futureScheduled = (input.upcomingScheduled ?? input.updates)
    .filter((row) => row.status === "scheduled" && Boolean(row.scheduled_for && row.scheduled_for > input.now.toISOString()))
    .sort((a, b) => a.scheduled_for!.localeCompare(b.scheduled_for!));
  const recentRows = [...(input.recentUpdates ?? input.updates)]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, DASHBOARD_RECENT_BROADCAST_LIMIT);
  const byPlatform = new Map<string, number>();
  for (const updateId of new Set(sentInPeriod.map((delivery) => delivery.update_id))) {
    const row = input.updates.find((update) => update.id === updateId);
    if (!row) continue;
    const platform = row.affected_platform_connection_id
      ? platformByConnection.get(row.affected_platform_connection_id) ?? null
      : row.source_provider;
    if (platform) byPlatform.set(platform, (byPlatform.get(platform) ?? 0) + 1);
  }
  return {
    periodDays: 30 as const,
    updatesSent: new Set(sentInPeriod.map((delivery) => delivery.update_id)).size,
    audienceReached: new Set(deliveredInPeriod.map((delivery) => delivery.contact_id)).size,
    openRate: null,
    clickRate: null,
    drafts: input.updates.filter((row) => row.status === "draft").length,
    scheduled: futureScheduled.length,
    nextScheduled: futureScheduled[0]
      ? itemFromRow(futureScheduled[0], input.deliveries, platformByConnection)
      : null,
    recent: recentRows.map((row) => itemFromRow(row, input.deliveries, platformByConnection)),
    byPlatform: [...byPlatform.entries()].map(([provider, count]) => ({ provider, count }))
      .sort((a, b) => b.count - a.count || a.provider.localeCompare(b.provider)),
  } satisfies AudienceUpdatesSummary;
}

export async function getAudienceUpdatesSummary(
  db: SupabaseClient<Database>,
  creatorId: string,
  now = new Date(),
): Promise<AudienceUpdatesSummary> {
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const updateSelection = "id,broadcast_type,broadcast_intent,status,title,scheduled_for,sent_at,queued_at,updated_at,affected_platform_connection_id,source_provider";
  const [{ data: updates, error: updatesError }, { data: recentUpdates, error: recentUpdatesError }, upcomingScheduled, { data: periodDeliveries, error: periodError }] = await Promise.all([
    db.from("creator_updates").select(
      updateSelection,
    ).eq("creator_id", creatorId).order("updated_at", { ascending: false }).limit(100),
    db.from("creator_updates").select(updateSelection)
      .eq("creator_id", creatorId).order("updated_at", { ascending: false }).limit(DASHBOARD_RECENT_BROADCAST_LIMIT),
    getUpcomingScheduledCommunications(db, creatorId, now),
    db.from("update_deliveries").select(
      "update_id,contact_id,transport,status,accepted_at,delivered_at",
    ).eq("creator_id", creatorId).in("status", [...SUCCESSFUL_SEND_STATUSES])
      .or(`accepted_at.gte.${cutoff},delivered_at.gte.${cutoff}`),
  ]);
  if (updatesError) throw updatesError;
  if (recentUpdatesError) throw recentUpdatesError;
  if (periodError) throw periodError;

  const updateRows = (updates ?? []) as UpdateRow[];
  const recentRows = (recentUpdates ?? []) as UpdateRow[];
  const recentIds = recentRows.map((row) => row.id);
  const platformIds = [...new Set(updateRows.map((row) => row.affected_platform_connection_id).filter((id): id is string => Boolean(id)))];
  const [{ data: recentDeliveries, error: recentError }, { data: platforms, error: platformsError }] = await Promise.all([
    recentIds.length
      ? db.from("update_deliveries").select("update_id,contact_id,transport,status,accepted_at,delivered_at")
        .eq("creator_id", creatorId).in("update_id", recentIds)
      : Promise.resolve({ data: [], error: null }),
    platformIds.length
      ? db.from("connected_accounts").select("id,platform").eq("creator_id", creatorId).in("id", platformIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (recentError) throw recentError;
  if (platformsError) throw platformsError;
  const deliveryByIdentity = new Map<string, DeliveryRow>();
  for (const row of [...(periodDeliveries ?? []), ...(recentDeliveries ?? [])] as DeliveryRow[]) {
    deliveryByIdentity.set(`${row.update_id}:${row.contact_id}:${row.transport}`, row);
  }
  return buildAudienceUpdatesSummary({
    now,
    updates: updateRows,
    recentUpdates: recentRows,
    upcomingScheduled: upcomingScheduled as UpdateRow[],
    deliveries: [...deliveryByIdentity.values()],
    platforms: (platforms ?? []) as Array<{ id: string; platform: string }>,
  });
}

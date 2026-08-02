import { createHash } from "node:crypto";
import type { AudienceProvider } from "@/lib/platform-audience/types";

export type CreatorProviderAccountRole = "official" | "backup" | "emergency_replacement" | "recovery_destination";
export type CreatorProviderAccount = {
  accountKey: string; provider: AudienceProvider; displayName: string; handle: string | null;
  role: CreatorProviderAccountRole; connected: boolean; verified: boolean; primary: boolean;
  archived: boolean; revoked: boolean; needsAttention: boolean; publicProfileUrl: string | null;
};

type Connection = { id: string; platform: string; account_type: string; label: string; url: string | null; is_primary?: boolean; connection_health?: string | null; provider_status?: string | null };
type Asset = { connected_account_id?: string | null; provider: string; display_name?: string | null; display_handle?: string | null; verification_status?: string | null; authority_status?: string | null };
type Identity = { source_connection_id?: string | null; provider: string; display_name?: string | null; display_handle?: string | null; verification_status?: string | null; official?: boolean; primary_for_provider?: boolean; account_kind?: string | null };

function asProvider(value: string): AudienceProvider | null {
  return (["youtube", "instagram", "tiktok", "x", "spotify", "twitch", "linkedin", "facebook", "snapchat", "threads", "pinterest", "discord"] as const).find((item) => item === value) ?? null;
}

function opaqueAccountKey(creatorId: string, sourceId: string) {
  return `acct_${createHash("sha256").update(`${creatorId}:${sourceId}`).digest("base64url").slice(0, 22)}`;
}

/** Canonical, metric-independent projection consumed by both dashboard surfaces. */
export function createCreatorAccountProjection(creatorId: string, connections: readonly Connection[], assets: readonly Asset[], identities: readonly Identity[]): CreatorProviderAccount[] {
  return connections.flatMap((connection) => {
    const provider = asProvider(connection.platform); if (!provider) return [];
    const asset = assets.find((row) => row.connected_account_id === connection.id);
    const identity = identities.find((row) => row.source_connection_id === connection.id);
    const revoked = connection.connection_health === "revoked" || connection.provider_status === "revoked" || asset?.verification_status === "revoked" || identity?.verification_status === "revoked";
    const archived = identity?.verification_status === "archived";
    const needsAttention = connection.connection_health === "degraded" || asset?.authority_status === "insufficient" || asset?.authority_status === "unavailable" || identity?.verification_status === "needs_attention";
    const role: CreatorProviderAccountRole = connection.account_type === "backup" ? "backup" : identity?.account_kind === "replacement_account" ? "emergency_replacement" : identity?.official === false ? "recovery_destination" : "official";
    return [{ accountKey: opaqueAccountKey(creatorId, connection.id), provider, displayName: identity?.display_name ?? asset?.display_name ?? connection.label, handle: identity?.display_handle ?? asset?.display_handle ?? null, role, connected: !revoked && connection.connection_health !== "disconnected", verified: asset?.verification_status === "verified" || identity?.verification_status === "verified", primary: Boolean(connection.is_primary || identity?.primary_for_provider), archived, revoked, needsAttention, publicProfileUrl: connection.url }];
  });
}

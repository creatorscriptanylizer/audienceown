import { createHash } from "node:crypto";
import type { AudienceProvider } from "@/lib/platform-audience/types";
import { canonicalAccountConnected, connectionHealthState, type ConnectionHealthState } from "./connection-health";

export type CreatorProviderAccountRole = "official" | "backup" | "emergency_replacement" | "recovery_destination";
export type CreatorProviderAccount = {
  accountKey: string; provider: AudienceProvider; displayName: string; handle: string | null;
  role: CreatorProviderAccountRole; connected: boolean; verified: boolean; primary: boolean;
  archived: boolean; revoked: boolean; needsAttention: boolean; publicProfileUrl: string | null;
  connectionHealth:ConnectionHealthState; lastSynchronizedAt:string|null; connectionType:"oauth"|"manual";
};

type Connection = { id: string; platform: string; account_type: string; label: string; url: string | null; is_primary?: boolean; connection_health?: string | null; provider_status?: string | null; external_account_id?:string|null; lease_expires_at?:string|null; capability_state?:unknown; last_sync_at?:string|null };
type Asset = { connected_account_id?: string | null; provider: string; display_name?: string | null; display_handle?: string | null; verification_status?: string | null; authority_status?: string | null };
type Identity = { source_connection_id?: string | null; provider: string; display_name?: string | null; display_handle?: string | null; verification_status?: string | null; official?: boolean; primary_for_provider?: boolean; account_kind?: string | null };

export function creatorConnectionProjectionState(connection: Connection, assets: readonly Asset[], identities: readonly Identity[]) {
  const asset = assets.find((row) => row.connected_account_id === connection.id);
  const identity = identities.find((row) => row.source_connection_id === connection.id);
  const revoked = connection.connection_health === "revoked" || connection.provider_status === "revoked" || asset?.verification_status === "revoked" || identity?.verification_status === "revoked";
  const archived = identity?.verification_status === "archived";
  const connected = !revoked && canonicalAccountConnected({health:connection.connection_health,providerStatus:connection.provider_status,hasPublicUrl:Boolean(connection.url),hasExternalAccountId:Boolean(connection.external_account_id)});
  return { asset, identity, revoked, archived, connected, active:connected && !archived && !revoked };
}

export function normalizeCreatorAccountRole(input: { accountType?: string | null; accountKind?: string | null; official?: boolean; primary?: boolean }): CreatorProviderAccountRole {
  const accountType = input.accountType?.trim().toLowerCase();
  const accountKind = input.accountKind?.trim().toLowerCase();
  if (accountType === "backup" || accountKind === "backup") return "backup";
  if (accountType === "emergency_replacement" || accountKind === "replacement_account" || accountKind === "emergency_replacement") return "emergency_replacement";
  if (accountType === "recovery_destination" || accountKind === "recovery_destination") return "recovery_destination";
  if (["official", "main", "primary"].includes(accountType ?? "") || input.official === true || input.primary) return "official";
  return input.official === false ? "recovery_destination" : "official";
}

function asProvider(value: string): AudienceProvider | null {
  return (["youtube", "instagram", "tiktok", "x", "spotify", "twitch", "linkedin", "facebook", "snapchat", "pinterest", "discord"] as const).find((item) => item === value) ?? null;
}

export function creatorAccountKey(creatorId: string, sourceId: string) {
  return `acct_${createHash("sha256").update(`${creatorId}:${sourceId}`).digest("base64url").slice(0, 22)}`;
}

function failureCategory(value:unknown){const root=value&&typeof value==="object"?value as Record<string,unknown>:{};const reliability=root.reliability&&typeof root.reliability==="object"?root.reliability as Record<string,unknown>:{};return typeof reliability.lastFailureCategory==="string"?reliability.lastFailureCategory:null;}

/** Canonical, metric-independent projection consumed by both dashboard surfaces. */
export function createCreatorAccountProjection(creatorId: string, connections: readonly Connection[], assets: readonly Asset[], identities: readonly Identity[]): CreatorProviderAccount[] {
  return connections.flatMap((connection) => {
    const provider = asProvider(connection.platform); if (!provider) return [];
    const { asset, identity, revoked, archived, connected } = creatorConnectionProjectionState(connection, assets, identities);
    const needsAttention = connection.connection_health === "degraded" || asset?.authority_status === "insufficient" || asset?.authority_status === "unavailable" || identity?.verification_status === "needs_attention";
    const primary = Boolean(connection.is_primary || identity?.primary_for_provider);
    const role = normalizeCreatorAccountRole({ accountType: connection.account_type, accountKind: identity?.account_kind, official: identity?.official, primary });
    const connectionHealth=connectionHealthState({externalAccountId:connection.external_account_id,health:connection.connection_health,leaseExpiresAt:connection.lease_expires_at,failureCategory:failureCategory(connection.capability_state)});
    return [{ accountKey: creatorAccountKey(creatorId, connection.id), provider, displayName: identity?.display_name ?? asset?.display_name ?? connection.label, handle: identity?.display_handle ?? asset?.display_handle ?? connection.label ?? null, role, connected, verified: asset?.verification_status === "verified" || identity?.verification_status === "verified", primary, archived, revoked, needsAttention, publicProfileUrl: connection.url, connectionHealth, lastSynchronizedAt:connection.last_sync_at??null, connectionType:connection.external_account_id?"oauth":"manual" }];
  });
}

/** The intentionally selected, active creator-wide Main account. Never promotes a Backup. */
export function resolveCreatorMain(accounts: readonly CreatorProviderAccount[]) {
  return accounts.find((account) => account.role === "official" && account.primary
    && account.connected && !account.archived && !account.revoked) ?? null;
}

/** Active Backups belong to the creator, independently of whether a Main exists. */
export function resolveCreatorBackups(accounts: readonly CreatorProviderAccount[]) {
  return accounts.filter((account) => account.role === "backup"
    && !account.archived && !account.revoked);
}

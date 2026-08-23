import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { AuthenticityRecord } from "@/lib/authenticity/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicAuthenticity } from "@/lib/authenticity/server";
import { getPublicRecoveryPassUrl } from "@/lib/canonical-public-url";
import { canonicalAccountConnected, resolveConnectionStatus } from "@/lib/social-providers/connection-health";
import { creatorVerificationSummary, resolveCreatorVerification, type CreatorVerificationResult } from "@/lib/creator-verification";
import { debugLog } from "@/lib/debug";

type DB = SupabaseClient<Database>;
type Creator = Database["public"]["Tables"]["creators"]["Row"];

export type PublicVerifiedAccount = {
  provider: string;
  displayName: string;
  handle: string | null;
  profileUrl: string | null;
  verificationStatus: "verified" | "pending" | "needs_attention" | "not_verified";
  connectionStatus: "connected" | "needs_attention" | "not_connected";
};

export type PublicRecoveryNetwork = {
  mainAccount: PublicVerifiedAccount;
  recoveryAccounts: PublicVerifiedAccount[];
  affected: boolean;
};

export type PublicVerifiedIdentity = {
  creator: { displayName: string; slug: string; avatar: string | null };
  creatorVerification: CreatorVerificationResult;
  verification: { verified: boolean; label: string; summary: string };
  officialAccounts: PublicVerifiedAccount[];
  recoveryNetworks: PublicRecoveryNetwork[];
  activeEmergencyState: null | {
    kind: "account_inaccessible" | "platform_migration";
    title: string;
    message: string;
    affectedAccount: PublicVerifiedAccount | null;
    replacement: AuthenticityRecord["emergency"] extends infer E ? E extends { replacement: infer R } ? R : never : never;
  };
  recoveryPass: { enabled: boolean; url: string };
  presentation: { publicTitle: string | null; publicSummary: string | null };
};

type AccountRow = Pick<Database["public"]["Tables"]["connected_accounts"]["Row"], "id" | "creator_id" | "platform" | "account_type" | "label" | "external_account_id" | "external_account_name" | "external_account_url" | "url" | "is_public" | "connection_health" | "provider_status" | "position">;
type IdentityRow = Pick<Database["public"]["Tables"]["creator_identity_accounts"]["Row"], "source_connection_id" | "verification_status" | "public_visible" | "official" | "display_name" | "display_handle" | "canonical_profile_url">;
type NetworkRow = { id: string; main_connected_account_id: string | null; position: number; recovery_network_destinations: { recovery_connected_account_id: string; created_at: string }[] };

function verificationStatus(identity?: IdentityRow): PublicVerifiedAccount["verificationStatus"] {
  if (!identity || ["unverified", "not_verified"].includes(identity.verification_status)) return "not_verified";
  if (["needs_attention", "failed"].includes(identity.verification_status)) return "needs_attention";
  return identity.verification_status === "verified" ? "verified" : "pending";
}

function publicAccount(connection: AccountRow, identity: IdentityRow | undefined, creatorId: string): PublicVerifiedAccount | null {
  const suppressed = ["revoked", "archived"].includes(identity?.verification_status ?? "") || ["revoked", "expired"].includes(connection.connection_health) || connection.provider_status === "revoked";
  const intentionallyPublic = connection.creator_id === creatorId && connection.is_public && identity?.public_visible !== false;
  if (!intentionallyPublic || suppressed) return null;
  const connected = canonicalAccountConnected({ health: connection.connection_health, providerStatus: connection.provider_status, hasPublicUrl: Boolean(connection.url), hasExternalAccountId: Boolean(connection.external_account_id) });
  const resolved = resolveConnectionStatus({ health: connection.connection_health, providerStatus: connection.provider_status, canonicalConnected: connected });
  const connectionStatus = !connected ? "not_connected" : resolved.connectionTone === "warning" || resolved.connectionTone === "danger" ? "needs_attention" : "connected";
  return { provider: connection.platform, displayName: identity?.display_name || identity?.display_handle || connection.external_account_name || connection.label, handle: identity?.display_handle ?? null, profileUrl: identity?.canonical_profile_url || connection.external_account_url || connection.url || null, verificationStatus: verificationStatus(identity), connectionStatus };
}

export function buildPublicVerifiedIdentity(input: {
  creator: Creator;
  record: AuthenticityRecord;
  connections: AccountRow[];
  identities: IdentityRow[];
  networks: NetworkRow[];
  affectedAccountId: string | null;
  emergencyType: string | null;
}): PublicVerifiedIdentity {
  const identityByConnection = new Map(input.identities.filter(row => row.source_connection_id).map(row => [row.source_connection_id!, row]));
  const ownedConnections = input.connections.filter(row => row.creator_id === input.creator.id);
  const creatorVerification = resolveCreatorVerification(ownedConnections, input.identities);
  const connectionById = new Map(ownedConnections.map(row => [row.id, row]));
  const officialAccounts = ownedConnections.filter(row => row.account_type === "official").map(row => publicAccount(row, identityByConnection.get(row.id), input.creator.id)).filter((row): row is PublicVerifiedAccount => Boolean(row));
  const mainPublicById = new Map(ownedConnections.filter(row => row.account_type === "official").map(row => [row.id, publicAccount(row, identityByConnection.get(row.id), input.creator.id)]));
  const recoveryNetworks = input.networks.flatMap(network => {
    const mainAccount = network.main_connected_account_id ? mainPublicById.get(network.main_connected_account_id) : null;
    if (!mainAccount || !network.main_connected_account_id) return [];
    const seen = new Set<string>();
    const recoveryAccounts = network.recovery_network_destinations.flatMap(link => {
      if (seen.has(link.recovery_connected_account_id)) return [];
      seen.add(link.recovery_connected_account_id);
      const connection = connectionById.get(link.recovery_connected_account_id);
      if (!connection || connection.account_type !== "backup") return [];
      const account = publicAccount(connection, identityByConnection.get(connection.id), input.creator.id);
      return account ? [account] : [];
    });
    return [{ mainAccount, recoveryAccounts, affected: network.main_connected_account_id === input.affectedAccountId }];
  }).sort((a, b) => Number(b.affected) - Number(a.affected));
  const affectedConnection = input.affectedAccountId ? connectionById.get(input.affectedAccountId) : null;
  const affectedAccount = affectedConnection ? publicAccount(affectedConnection, identityByConnection.get(affectedConnection.id), input.creator.id) : null;
  return {
    creator: { displayName: input.record.creator.displayName, slug: input.record.creator.slug, avatar: input.creator.profile_image_path },
    creatorVerification,
    verification: { verified: creatorVerification.verified, label: creatorVerification.verified ? "Verified by AudienceOwn" : "Verification pending", summary: creatorVerificationSummary(input.record.creator.displayName, creatorVerification) },
    officialAccounts,
    recoveryNetworks,
    activeEmergencyState: input.record.emergency ? { kind: input.emergencyType === "account_changed" ? "platform_migration" : "account_inaccessible", title: input.record.emergency.title, message: input.record.emergency.message, affectedAccount, replacement: input.record.emergency.replacement } : null,
    recoveryPass: { enabled: input.creator.recovery_pass_enabled, url: getPublicRecoveryPassUrl(input.record.creator.slug) },
    presentation: {
      publicTitle: input.record.authenticity.title?.trim() || null,
      publicSummary: input.record.authenticity.publicSummary?.trim() || null,
    },
  };
}

export async function loadPublicVerifiedIdentity(db: DB, creator: Creator, record: AuthenticityRecord): Promise<PublicVerifiedIdentity> {
  const [connections, identities, networks, emergency] = await Promise.all([
    db.from("connected_accounts").select("id,creator_id,platform,account_type,label,external_account_id,external_account_name,external_account_url,url,is_public,connection_health,provider_status,position").eq("creator_id", creator.id).order("position"),
    db.from("creator_identity_accounts").select("source_connection_id,verification_status,public_visible,official,display_name,display_handle,canonical_profile_url").eq("creator_id", creator.id),
    db.from("recovery_networks").select("id,main_connected_account_id,position,recovery_network_destinations(recovery_connected_account_id,created_at)").eq("creator_id", creator.id).order("position"),
    db.from("creator_emergencies").select("id,emergency_type").eq("creator_id", creator.id).eq("lifecycle_status", "active").maybeSingle(),
  ]);
  if (connections.error || identities.error || networks.error || emergency.error) throw new Error("public_verified_identity_load_failed");
  let affectedAccountId: string | null = null;
  if (emergency.data?.id) {
    const affected = await db.from("emergency_affected_accounts").select("connected_account_id").eq("creator_id", creator.id).eq("emergency_id", emergency.data.id).order("created_at").limit(1).maybeSingle();
    if (affected.error) throw new Error("public_verified_identity_emergency_load_failed");
    affectedAccountId = affected.data?.connected_account_id ?? null;
  }
  const model=buildPublicVerifiedIdentity({ creator, record, connections: connections.data ?? [], identities: identities.data ?? [], networks: (networks.data ?? []) as NetworkRow[], affectedAccountId, emergencyType: emergency.data?.emergency_type ?? null });
  debugLog("general",{event:"creator_verification_resolved",status:model.creatorVerification.status,totalMainAccountCount:model.creatorVerification.totalMainAccountCount,verifiedMainAccountCount:model.creatorVerification.verifiedMainAccountCount,basis:model.creatorVerification.basis});
  return model;
}

export type PublicVerifiedIdentityResult =
  | { status: "available"; data: PublicVerifiedIdentity }
  | { status: "absent"; data: null }
  | { status: "unavailable"; data: null };

export async function getPublicVerifiedIdentity(slug: string): Promise<PublicVerifiedIdentityResult> {
  const authenticity = await getPublicAuthenticity(slug);
  if (authenticity.status === "absent") return { status: "absent", data: null };
  if (authenticity.status === "unavailable") return { status: "unavailable", data: null };
  const db = createAdminClient();
  if (!db) return { status: "unavailable", data: null };
  const creatorResult = await db.from("creators").select("*").eq("public_slug", authenticity.data.creator.slug).eq("public_profile_enabled", true).maybeSingle();
  if (creatorResult.error) return { status: "unavailable", data: null };
  if (!creatorResult.data) return { status: "absent", data: null };
  try { return { status: "available", data: await loadPublicVerifiedIdentity(db, creatorResult.data, authenticity.data) }; }
  catch { return { status: "unavailable", data: null }; }
}

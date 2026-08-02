import type { AudienceProvider } from "@/lib/platform-audience/types";

export type ProviderConnectionStatus = "connected" | "verified" | "attention" | "revoked" | "not_connected";
export type ProviderConnectionState = {
  provider: AudienceProvider;
  connected: boolean;
  verified: boolean;
  selectedAsset: boolean;
  status: ProviderConnectionStatus;
};

type Connection = { platform: string; connection_health?: string | null; provider_status?: string | null };
type Asset = { provider: string; verification_status?: string | null; authority_status?: string | null };
type Identity = { provider: string; verification_status?: string | null };

/** Shared, metric-independent provider state used by Platforms and Dashboard surfaces. */
export function resolveProviderConnection(
  provider: AudienceProvider,
  connections: readonly Connection[],
  assets: readonly Asset[],
  identities: readonly Identity[],
): ProviderConnectionState {
  const connection = connections.find((row) => row.platform === provider);
  const asset = assets.find((row) => row.provider === provider);
  const identity = identities.find((row) => row.provider === provider);
  const connected = Boolean(connection || asset || identity);
  const revoked = connection?.provider_status === "revoked" || asset?.verification_status === "revoked" || identity?.verification_status === "revoked";
  const verified = asset?.verification_status === "verified" || identity?.verification_status === "verified";
  const attention = connection?.connection_health === "degraded" || asset?.authority_status === "insufficient" || asset?.authority_status === "unavailable" || identity?.verification_status === "needs_attention";
  return { provider, connected, verified, selectedAsset: Boolean(asset), status: !connected ? "not_connected" : revoked ? "revoked" : attention ? "attention" : verified ? "verified" : "connected" };
}

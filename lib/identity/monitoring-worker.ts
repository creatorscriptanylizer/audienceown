import "server-only";
import { randomUUID } from "node:crypto";
import type { Json } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSocialSecret } from "@/lib/social-secrets";
import { getSocialProvider } from "@/lib/social-providers/registry";
import { isSocialProvider } from "@/lib/social-providers/normalize";
import { accountMonitoringFingerprint } from "./monitoring-fingerprint";
import { classifyIdentityObservation, preciseAccountChanges, type MonitoringObservationType } from "./monitoring-policy";

function metadata(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined; }
function positive(value: string | undefined, fallback: number, max: number) { const n = Number(value); return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback; }
function observationResult(value: unknown): { inserted: boolean; observation_id: string } | null { if (!value || typeof value !== "object" || Array.isArray(value)) return null; const row = value as Record<string, unknown>; return typeof row.inserted === "boolean" && typeof row.observation_id === "string" ? { inserted: row.inserted, observation_id: row.observation_id } : null; }

export async function runIdentityMonitoring(requestedLimit?: number) {
  const db = createAdminClient(); if (!db) throw new Error("identity_monitor_not_configured");
  const limit = Math.max(1, Math.min(requestedLimit ?? positive(process.env.IDENTITY_MONITOR_BATCH_SIZE, 20, 100), 100)), leaseOwner = randomUUID();
  const { data: accounts, error } = await db.rpc("claim_identity_monitoring", { p_limit: limit, p_lease_owner: leaseOwner }); if (error) throw error;
  const summary = { claimed: accounts?.length ?? 0, observations: 0, incidents: 0, confirmed: 0, failed: 0, byProvider: {} as Record<string, number> };
  async function record(account: NonNullable<typeof accounts>[number], type: MonitoringObservationType, sourceEventId: string, extra: Record<string, unknown> = {}) {
    const classification = classifyIdentityObservation(type, { official: account.official, primary: account.primary_for_provider, publicVisible: account.public_visible, failureCount: account.monitor_attempts });
    const { data, error: ingestError } = await db.rpc("ingest_identity_observation", { p_profile_id: account.identity_profile_id, p_observation_type: type, p_severity: classification.severity, p_source: "identity_sync_worker", p_source_event_id: sourceEventId, p_account_id: account.id, p_observed_at: new Date().toISOString(), p_metadata: extra as Json });
    if (ingestError) throw ingestError;
    const inserted = observationResult(data); if (!inserted?.inserted) return;
    summary.observations++;
    const { data: incident, error: processError } = await db.rpc("process_identity_observation", { p_observation_id: inserted.observation_id });
    if (processError) throw processError; if (incident) summary.incidents++;
  }
  for (const account of accounts ?? []) {
    try {
      if (!account.source_connection_id || !isSocialProvider(account.provider)) throw new Error("provider_unavailable");
      const adapter = getSocialProvider(account.provider), fetcher = adapter.fetchEmergencyAccountIdentity ?? adapter.fetchIdentity; if (!fetcher) throw new Error("provider_unavailable");
      const [{ data: connection, error: connectionError }, { data: secret, error: secretError }] = await Promise.all([db.from("connected_accounts").select("*").eq("id", account.source_connection_id).single(), db.from("platform_connection_secrets").select("access_token_ciphertext,refresh_token_ciphertext").eq("platform_connection_id", account.source_connection_id).single()]);
      if (connectionError || secretError) throw connectionError ?? secretError;
      if (!connection || !secret || ["revoked", "expired"].includes(connection.connection_health)) {
        await record(account, "provider_grant_revoked", `monitor:${account.id}:provider_grant_revoked:${account.monitor_attempts + 1}`, { failure_count: account.monitor_attempts + 1 });
      } else {
        const identity = await fetcher({ accessToken: decryptSocialSecret(secret.access_token_ciphertext), refreshToken: secret.refresh_token_ciphertext ? decryptSocialSecret(secret.refresh_token_ciphertext) : undefined, metadata: metadata(connection.provider_metadata) });
        const types = preciseAccountChanges({ stableId: account.stable_provider_account_id, handle: account.display_handle, name: account.display_name, url: account.canonical_profile_url }, { stableId: identity.id, handle: identity.name, name: identity.name, url: identity.url });
        const fingerprint = accountMonitoringFingerprint({ provider: account.provider, stableProviderAccountId: identity.id, displayHandle: identity.name, displayName: identity.name, canonicalProfileUrl: identity.url, verificationStatus: account.verification_status, official: account.official, publicVisible: account.public_visible, primaryForProvider: account.primary_for_provider, providerHealthState: "healthy" });
        for (const type of types) await record(account, type, `monitor:${account.id}:${fingerprint}:${type}`, type === "account_handle_changed" ? { handle: identity.name } : type === "account_display_name_changed" ? { display_name: identity.name } : type === "account_url_changed" ? { canonical_url: identity.url } : type === "stable_identity_mismatch" ? { stable_id: identity.id } : {});
        const { error: updateError } = await db.from("creator_identity_accounts").update({ monitoring_fingerprint: fingerprint, next_monitor_at: new Date(Date.now() + positive(process.env.IDENTITY_MONITOR_NORMAL_INTERVAL_HOURS, 24, 168) * 36e5).toISOString(), monitor_lease_owner: null, monitor_lease_expires_at: null, monitor_attempts: 0 }).eq("id", account.id); if (updateError) throw updateError;
        summary.confirmed++; summary.byProvider[account.provider] = (summary.byProvider[account.provider] ?? 0) + 1; continue;
      }
    } catch {
      summary.failed++;
      try { await record(account, "sync_failure", `monitor:${account.id}:sync_failure:${account.monitor_attempts + 1}`, { failure_count: account.monitor_attempts + 1 }); } catch { /* iteration already remains failed */ }
    }
    const failureCount = account.monitor_attempts + 1, backoff = Math.min(2 ** failureCount, positive(process.env.IDENTITY_MONITOR_MAX_ATTEMPTS, 6, 12) * 10);
    const { error: releaseError } = await db.from("creator_identity_accounts").update({ next_monitor_at: new Date(Date.now() + backoff * 60e3).toISOString(), monitor_lease_owner: null, monitor_lease_expires_at: null, monitor_attempts: failureCount }).eq("id", account.id); if (releaseError) throw releaseError;
  }
  return summary;
}

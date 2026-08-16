import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidateCreatorAccounts } from "./creator-account-revalidation";
import { authorizedProviderCredential, logProviderOperation } from "./authorized-credential";
import { normalizeProviderFailure, providerRetryDelaySeconds, SocialProviderError } from "./errors";
import { getSocialProvider } from "./registry";
import { isSocialProvider, validateNormalizedContent } from "./normalize";
import { createTraceId, debugDatabaseError, debugStep } from "@/lib/debug";

type PollScope = "all" | "expansion-two" | "expansion-three" | "expansion-four";
function reliability(value: unknown) {
  const root = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const state = root.reliability && typeof root.reliability === "object" ? root.reliability as Record<string, unknown> : {};
  return { root, state };
}

export async function pollSocialConnections(limit = 20, scope: PollScope = "all") {
  const admin = createAdminClient();
  if (!admin) throw new Error("Social polling is not configured.");
  const leaseOwner = randomUUID();
  const claim = scope === "expansion-two"
    ? await admin.rpc("claim_expansion_two_connections", { p_limit: limit, p_lease_owner: leaseOwner })
    : scope === "expansion-three"
      ? await admin.rpc("claim_expansion_three_connections", { p_limit: limit, p_lease_owner: leaseOwner })
      : scope === "expansion-four"
        ? await admin.rpc("claim_expansion_four_connections", { p_limit: limit, p_lease_owner: leaseOwner })
        : await admin.rpc("claim_social_connections", { p_limit: limit, p_lease_seconds: 180, p_lease_owner: leaseOwner });
  if (claim.error) throw claim.error;
  const connections = claim.data ?? [];
  const summary = { claimed: connections.length, polled: 0, detected: 0, duplicates: 0, drafts: 0, autoPublished: 0, failed: 0, byProvider: {} as Record<string, { claimed: number; detected: number; failed: number }> };

  for (const connection of connections) {
    if (!isSocialProvider(connection.platform)) continue;
    const provider = connection.platform;
    const adapter = getSocialProvider(provider);
    const providerSummary = summary.byProvider[provider] ??= { claimed: 0, detected: 0, failed: 0 };
    providerSummary.claimed++;
    const { root, state } = reliability(connection.capability_state);
    const previousFailures = typeof state.consecutiveFailures === "number" ? state.consecutiveFailures : 0;
    const attemptedAt = new Date().toISOString();
    const traceId = createTraceId("sync");
    const diagnosticContext = { traceId, area:"provider_sync", provider, connectionId:connection.id, creatorId:connection.creator_id };
    logProviderOperation("sync_started", { provider, connectionId: connection.id, attempt: previousFailures + 1 });
    try {
      if (!adapter.capabilities.polling || !adapter.pollContent) throw new SocialProviderError("provider_capability_not_supported", provider, "Polling unavailable.");
      let diagnostic = debugStep("sync", "credential_load", diagnosticContext);
      const credential = await authorizedProviderCredential({ db: admin, connection, adapter, leaseOwner, traceId });
      diagnostic.success();
      diagnostic = debugStep("sync", "provider_request", diagnosticContext);
      const result = await adapter.pollContent({ accessToken: credential.accessToken, refreshToken: credential.refreshToken, cursor: connection.last_external_cursor, metadata: { ...(connection.provider_metadata as Record<string, unknown>), externalAccountId: connection.external_account_id } });
      diagnostic.success({ count:result.items.length });
      for (const candidate of result.items) {
        diagnostic = debugStep("sync", "normalization", diagnosticContext);
        const item = validateNormalizedContent(candidate);
        if (!item) throw new SocialProviderError("malformed_provider_object", provider, "Provider content was incomplete.");
        diagnostic.success();
        diagnostic = debugStep("sync", "metric_upsert", diagnosticContext);
        const { data: ingested, error: ingestError } = await admin.rpc("ingest_social_detection", {
          p_connection_id: connection.id, p_provider: provider, p_external_object_id: item.externalObjectId,
          p_external_event_id: item.externalEventId ?? "", p_object_type: item.objectType, p_event_type: item.eventType,
          p_source_payload: { ...item.rawMetadata, title: item.title, description: item.description, canonical_url: item.canonicalUrl, thumbnail_url: item.thumbnailUrl, media_urls: item.mediaUrls, scheduled_start_at: item.scheduledStartAt, live_status: item.liveStatus },
          p_source_published_at: item.sourcePublishedAt, p_detection_source: "polling",
        });
        if (ingestError) { diagnostic.failed(ingestError); debugDatabaseError("ingest_social_detection", "social_detection_events", ingestError, diagnosticContext); throw ingestError; }
        diagnostic.success();
        const ingestion = ingested as { event_id: string; inserted: boolean };
        if (!ingestion.inserted) { summary.duplicates++; continue; }
        summary.detected++; providerSummary.detected++;
        if (connection.auto_create_drafts) {
          const { data: draft, error: draftError } = await admin.rpc("create_social_draft", { p_event_id: ingestion.event_id });
          if (draftError) throw draftError;
          const created = draft as { update_id: string; created: boolean; auto_send: boolean };
          if (created.created) summary.drafts++;
          if (created.auto_send && adapter.capabilities.automaticPublishing) await admin.rpc("enqueue_ai_draft_enhancement", { p_update_id: created.update_id, p_prompt_version: "social-draft-v1", p_requested_variants: ["standard", "concise", "detailed", "browser", "sms", "recovery"], p_auto_send_requested: true });
        }
      }
      const cadence = Number(process.env.SOCIAL_POLL_INTERVAL_MINUTES ?? 5);
      const nextSync = adapter.calculateNextSync?.(result) ?? new Date(Date.now() + Math.max(1, cadence) * 60_000);
      diagnostic = debugStep("sync", "cursor_update", diagnosticContext);
      const marked = await admin.rpc("mark_social_connection_healthy", { p_connection_id: connection.id, p_cursor: result.cursor ?? connection.last_external_cursor ?? "", p_next_sync_at: nextSync.toISOString() });
      if (marked.error) throw marked.error;
      diagnostic.success();
      diagnostic = debugStep("sync", "next_sync_update", diagnosticContext);
      await admin.from("connected_accounts").update({ capability_state: { ...root, reliability: { consecutiveFailures: 0, lastAttemptedSyncAt: attemptedAt, lastSuccessfulSyncAt: new Date().toISOString(), lastFailureCategory: null, lastFailureCode: null, rateLimitedUntil: null } } }).eq("id", connection.id);
      diagnostic.success();
      summary.polled++;
      logProviderOperation("sync_succeeded", { provider, connectionId: connection.id });
    } catch (error) {
      debugStep("sync", "provider_sync", diagnosticContext).failed(error);
      summary.failed++; providerSummary.failed++;
      const failure = normalizeProviderFailure(error);
      const attempts = previousFailures + 1;
      const delay = providerRetryDelaySeconds(attempts, failure.retryAfterSeconds);
      const nextSync = new Date(Date.now() + delay * 1000).toISOString();
      const health = failure.reconnectRequired ? "revoked" : "degraded";
      await admin.rpc("mark_social_connection_unhealthy", { p_connection_id: connection.id, p_health: health, p_error: failure.code, p_next_sync_at: nextSync });
      await admin.from("connected_accounts").update({
        capability_state: { ...root, reliability: { consecutiveFailures: attempts, lastAttemptedSyncAt: attemptedAt, lastFailureCategory: failure.category, lastFailureCode: failure.code, lastFailureAt: new Date().toISOString(), rateLimitedUntil: failure.category === "rate_limit" ? nextSync : null } },
        ...(failure.reconnectRequired ? { provider_status:"reconnect_required" } : {}),
        ...(failure.retryable ? {} : { next_sync_at: null, watch_enabled: false }),
      }).eq("id", connection.id);
      logProviderOperation(failure.reconnectRequired ? "reconnect_required" : "sync_failed", { provider, connectionId: connection.id, category: failure.category, code: failure.code, attempt: attempts });
    }
    revalidateCreatorAccounts(connection.creator_id);
  }
  return summary;
}

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSocialSecret, encryptSocialSecret } from "@/lib/social-secrets";
import { publishDeliveryQueue } from "@/lib/update-delivery";
import { refreshYouTubeAccessToken } from "@/lib/youtube-oauth";
import { pollYouTubeUploads, YouTubeProviderError } from "@/lib/youtube-watcher";

type PollSummary = {
  claimed: number; polled: number; detected: number; duplicates: number;
  drafts: number; autoPublished: number; failed: number;
  outcomes: Array<{ connectionId: string; status: string; detected: number; drafts: number }>;
};

export async function pollYouTubeConnections(limit = 10): Promise<PollSummary> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Social polling is not configured.");
  const { data: connections, error } = await admin.rpc("claim_youtube_connections", { p_limit: limit, p_lease_seconds: 180 });
  if (error) throw new Error("Unable to claim YouTube connections.");
  const summary: PollSummary = {
    claimed: connections?.length ?? 0, polled: 0, detected: 0, duplicates: 0,
    drafts: 0, autoPublished: 0, failed: 0, outcomes: [],
  };
  for (const connection of connections ?? []) {
    const outcome = { connectionId: connection.id, status: "healthy", detected: 0, drafts: 0 };
    console.info("social_automation", { event: "poll_started", provider: "youtube", connectionId: connection.id });
    try {
      const { data: secret } = await admin.from("platform_connection_secrets").select("*")
        .eq("platform_connection_id", connection.id).maybeSingle();
      if (!secret) throw new YouTubeProviderError("revoked", "YouTube credentials are unavailable.");
      let accessToken = decryptSocialSecret(secret.access_token_ciphertext);
      if (!connection.token_expires_at || new Date(connection.token_expires_at).getTime() < Date.now() + 60_000) {
        if (!secret.refresh_token_ciphertext) throw new YouTubeProviderError("revoked", "Reconnect YouTube.");
        const refreshed = await refreshYouTubeAccessToken(decryptSocialSecret(secret.refresh_token_ciphertext));
        accessToken = refreshed.access_token;
        await Promise.all([
          admin.from("platform_connection_secrets").update({
            access_token_ciphertext: encryptSocialSecret(accessToken),
            ...(refreshed.refresh_token ? { refresh_token_ciphertext: encryptSocialSecret(refreshed.refresh_token) } : {}),
          }).eq("platform_connection_id", connection.id),
          admin.from("connected_accounts").update({
            token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
            token_refreshed_at: new Date().toISOString(),
          }).eq("id", connection.id),
        ]);
        console.info("social_automation", { event: "token_refreshed", provider: "youtube", connectionId: connection.id });
      }
      const metadata = connection.external_metadata as { uploads_playlist_id?: string } | null;
      if (!metadata?.uploads_playlist_id) throw new YouTubeProviderError("malformed", "Uploads playlist is unavailable.");
      const result = await pollYouTubeUploads(accessToken, metadata.uploads_playlist_id, connection.last_external_cursor);
      for (const item of result.items.reverse()) {
        if (!item.publishedAt) {
          summary.failed++;
          console.warn("social_automation", {
            event: "provider_failure", provider: "youtube", connectionId: connection.id,
            externalObjectId: item.externalObjectId, category: "missing_publication_timestamp",
          });
          continue;
        }
        const { data: ingested, error: ingestError } = await admin.rpc("ingest_youtube_detection", {
          p_connection_id: connection.id, p_external_object_id: item.externalObjectId,
          p_object_type: item.objectType, p_event_type: item.eventType,
          p_source_payload: {
            title: item.title, description: item.description, canonical_url: item.canonicalUrl,
            thumbnail_url: item.thumbnailUrl, scheduled_start_time: item.scheduledStartTime,
            live_status: item.liveStatus, content_type: item.objectType,
          }, p_source_published_at: item.publishedAt,
        });
        if (ingestError) throw ingestError;
        const ingestion = ingested as { event_id: string; inserted: boolean };
        if (!ingestion.inserted) {
          summary.duplicates++;
          console.info("social_automation", { event: "duplicate_ignored", provider: "youtube",
            connectionId: connection.id, externalObjectId: item.externalObjectId });
          continue;
        }
        summary.detected++; outcome.detected++;
        console.info("social_automation", { event: "content_detected", provider: "youtube",
          connectionId: connection.id, externalObjectId: item.externalObjectId, contentType: item.objectType });
        if (connection.auto_create_drafts) {
          const { data: draft, error: draftError } = await admin.rpc("create_youtube_draft", { p_event_id: ingestion.event_id });
          if (draftError) throw draftError;
          const created = draft as { update_id: string; created: boolean; auto_send: boolean };
          if (created.created) { summary.drafts++; outcome.drafts++; }
          if (created.auto_send) {
            try {
              await publishDeliveryQueue(created.update_id, connection.creator_id, null, admin);
              await admin.from("imported_social_content").update({
                status: "auto_published", approved_at: new Date().toISOString(), published_at: new Date().toISOString(),
              }).eq("creator_update_id", created.update_id);
              summary.autoPublished++;
              console.info("social_automation", { event: "automatic_publication", provider: "youtube",
                connectionId: connection.id, updateId: created.update_id });
            } catch {
              await admin.from("creator_activity").insert({
                creator_id: connection.creator_id, activity_type: "social_publish_failed",
                title: "YouTube draft needs attention", body: "Automatic publication could not be completed.",
                creator_update_id: created.update_id,
              });
            }
          }
        }
      }
      await admin.from("connected_accounts").update({
        last_external_cursor: result.cursor, last_sync_at: new Date().toISOString(),
        connection_health: "healthy", last_connection_error: null, poll_claimed_until: null,
      }).eq("id", connection.id);
      summary.polled++;
    } catch (error) {
      summary.failed++; outcome.status = error instanceof YouTubeProviderError ? error.code : "failed";
      const health = error instanceof YouTubeProviderError && ["unauthorized","revoked"].includes(error.code)
        ? error.code === "revoked" ? "revoked" : "expired" : "degraded";
      const safeMessage = error instanceof Error ? error.message.slice(0, 500) : "YouTube polling failed.";
      await admin.from("connected_accounts").update({
        connection_health: health, last_connection_error: safeMessage, poll_claimed_until: null,
      }).eq("id", connection.id);
      console.warn("social_automation", { event: "provider_failure", provider: "youtube",
        connectionId: connection.id, category: outcome.status });
    }
    summary.outcomes.push(outcome);
    console.info("social_automation", { event: "poll_completed", provider: "youtube", ...outcome });
  }
  return summary;
}

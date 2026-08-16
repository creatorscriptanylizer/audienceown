import { z } from "zod";
import { getCreator, getViewer } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSocialSecret } from "@/lib/social-secrets";
import { requireSameOrigin } from "@/lib/emergency/request-security";
import { persistYouTubeConnection, YouTubeConnectionError } from "@/lib/youtube-connection";
import type { YouTubeChannelIdentity } from "@/lib/youtube-watcher";

export const runtime = "nodejs";
const schema = z.object({ pendingSelectionId: z.string().uuid(), selectedChannelId: z.string().min(1).max(128) }).strict();
function validChannel(value: unknown): value is YouTubeChannelIdentity {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.title === "string" && typeof item.uploadsPlaylistId === "string"
    && (typeof item.subscriberCount === "string" || item.subscriberCount === null) && typeof item.hiddenSubscriberCount === "boolean";
}
function failure(status: string, message: string, code = 400) { return Response.json({ status, message }, { status: code }); }

export async function POST(request: Request) {
  if (!requireSameOrigin(request)) return failure("selection_invalid", "This channel selection request could not be verified.", 403);
  let body: z.infer<typeof schema>;
  try { body = schema.parse(await request.json()); } catch { return failure("selection_invalid", "Choose one of the authorized YouTube channels."); }
  const [user, creator] = await Promise.all([getViewer(), getCreator()]);
  const admin = createAdminClient();
  if (!user || !creator || !admin) return failure("selection_invalid", "Sign in again to choose a channel.", 401);
  const pending = await admin.from("youtube_oauth_pending_selections").select("*")
    .eq("id", body.pendingSelectionId).eq("creator_id", creator.id).eq("user_id", user.id).maybeSingle();
  if (pending.error || !pending.data) return failure("selection_invalid", "This channel selection is not available.", 404);
  if (pending.data.consumed_at || pending.data.expires_at <= new Date().toISOString()) return failure("selection_expired", "This channel selection expired. Connect YouTube again.", 410);
  if (pending.data.requested_role !== "official" && pending.data.requested_role !== "backup") return failure("selection_invalid", "This channel selection is invalid.");
  const channels = Array.isArray(pending.data.eligible_channels) ? pending.data.eligible_channels.filter(validChannel) : [];
  const channel = channels.find((candidate) => candidate.id === body.selectedChannelId);
  if (!channel) return failure("selection_invalid", "Choose one of the YouTube channels returned by this authorization.");

  const claim = await admin.from("youtube_oauth_pending_selections").update({ consumed_at: new Date().toISOString() })
    .eq("id", pending.data.id).is("consumed_at", null).select("id").maybeSingle();
  if (claim.error || !claim.data) return failure("selection_expired", "This channel selection was already used.", 409);
  try {
    await persistYouTubeConnection({
      admin, creatorId: creator.id, role: pending.data.requested_role,
      reconnectConnectionId: pending.data.reconnect_connection_id ?? undefined, protectedOfficialAccountId:pending.data.protected_official_account_id??undefined, channel,
      tokens: {
        accessToken: decryptSocialSecret(pending.data.access_token_ciphertext),
        refreshToken: pending.data.refresh_token_ciphertext ? decryptSocialSecret(pending.data.refresh_token_ciphertext) : undefined,
        scope: pending.data.granted_scopes.join(" "), tokenType: pending.data.token_type, expiresAt: pending.data.token_expires_at,
      },
    });
    const removed = await admin.from("youtube_oauth_pending_selections").delete().eq("id", pending.data.id);
    if (removed.error) console.warn("provider_oauth", { event: "pending_selection_cleanup_failed", provider: "youtube", role: pending.data.requested_role });
    return Response.json({ status: "connected" });
  } catch (error) {
    await admin.from("youtube_oauth_pending_selections").update({ consumed_at: null }).eq("id", pending.data.id);
    if (error instanceof YouTubeConnectionError && error.code === "already_connected") return failure("already_connected", "That YouTube channel is already connected to AudienceOwn.", 409);
    if (error instanceof YouTubeConnectionError && error.code === "reconnect_mismatch") return failure("reconnect_mismatch", "This authorization belongs to a different YouTube channel.", 409);
    if (error instanceof YouTubeConnectionError && error.code === "connection_limit_reached") return failure("connection_limit_reached", "You've reached your Free plan connection limit.", 409);
    return failure("connection_failed", "AudienceOwn could not save this YouTube channel. Please try again.", 500);
  }
}

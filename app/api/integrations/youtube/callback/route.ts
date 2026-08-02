import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCreator, getViewer } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSocialSecret } from "@/lib/social-secrets";
import { exchangeYouTubeCode, verifyYouTubeOAuthState } from "@/lib/youtube-oauth";
import { getYouTubeChannel } from "@/lib/youtube-watcher";
import { revalidateCreatorAccounts } from "@/lib/social-providers/creator-account-revalidation";

export const runtime = "nodejs";

function dashboard(request: Request, status: string) {
  return NextResponse.redirect(new URL(`/dashboard/platforms?youtube=${encodeURIComponent(status)}`, request.url));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateValue = url.searchParams.get("state");
  const store = await cookies();
  const nonce = store.get("youtube_oauth_nonce")?.value;
  store.delete("youtube_oauth_nonce");
  if (!code || !stateValue || !nonce || url.searchParams.has("error")) return dashboard(request, "authorization_failed");
  const state = verifyYouTubeOAuthState(stateValue, nonce);
  const [user, creator] = await Promise.all([getViewer(), getCreator()]);
  if (!state || !user || !creator || state.userId !== user.id || state.creatorId !== creator.id) {
    return dashboard(request, "invalid_state");
  }
  const admin = createAdminClient();
  if (!admin) return dashboard(request, "not_configured");
  try {
    const tokens = await exchangeYouTubeCode(code);
    const channel = await getYouTubeChannel(tokens.access_token);
    const connectionValues = {
      creator_id: creator.id, platform: "youtube", account_type: "official",
      label: channel.title, url: `https://www.youtube.com/channel/${channel.id}`,
      is_primary: true, is_public: true, watch_enabled: true, auto_create_drafts: true,
      auto_send: false, connection_health: "healthy", last_connection_error: null,
      external_account_id: channel.id, external_account_name: channel.title,
      provider_metadata: { uploads_playlist_id: channel.uploadsPlaylistId },
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      token_refreshed_at: new Date().toISOString(),
    };
    const { data: existingConnection } = await admin.from("connected_accounts").select("id")
      .eq("creator_id", creator.id).eq("platform", "youtube").eq("account_type", "official").limit(1).maybeSingle();
    const { data: connection, error } = existingConnection
      ? await admin.from("connected_accounts").update(connectionValues).eq("id", existingConnection.id).select("id").single()
      : await admin.from("connected_accounts").insert(connectionValues).select("id").single();
    if (error || !connection) throw new Error("connection_write_failed");
    const existing = await admin.from("platform_connection_secrets").select("refresh_token_ciphertext")
      .eq("platform_connection_id", connection.id).maybeSingle();
    await admin.from("platform_connection_secrets").upsert({
      platform_connection_id: connection.id,
      access_token_ciphertext: encryptSocialSecret(tokens.access_token),
      refresh_token_ciphertext: tokens.refresh_token
        ? encryptSocialSecret(tokens.refresh_token)
        : existing.data?.refresh_token_ciphertext ?? null,
      token_scope: tokens.scope ?? null, token_type: tokens.token_type ?? "Bearer",
    });
    console.info("social_automation", { event: "connection_established", provider: "youtube", connectionId: connection.id });
    revalidateCreatorAccounts(creator.id);
    return dashboard(request, "connected");
  } catch (error) {
    console.warn("social_automation", { event: "provider_failure", provider: "youtube", phase: "oauth_callback",
      reason: error instanceof Error ? error.message : "unknown" });
    return dashboard(request, "connection_failed");
  }
}

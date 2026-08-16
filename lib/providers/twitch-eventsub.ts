import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSocialSecret } from "@/lib/social-secrets";

const subscriptions = ["stream.online", "stream.offline", "channel.update", "user.update", "authorization.revoke"] as const;
function extractSubscriptionId(value: unknown) { if (!value || typeof value !== "object" || Array.isArray(value)) return null; const data = (value as { data?: unknown }).data; if (!Array.isArray(data) || !data[0] || typeof data[0] !== "object") return null; const id = (data[0] as { id?: unknown }).id; return typeof id === "string" ? id : null; }

export async function reconcileTwitchEventSub() {
  const db = createAdminClient(); if (!db) throw new Error("provider_expansion_not_configured");
  const callback = process.env.TWITCH_EVENTSUB_CALLBACK_URL, secret = process.env.TWITCH_EVENTSUB_SECRET, clientId = process.env.TWITCH_CLIENT_ID;
  if (!callback || !secret || !clientId) return { configured: false, connections: 0, created: 0, failed: 0, limitations: ["EventSub callback, secret, and Twitch client ID are required."] };
  const { data: connections, error: connectionsError } = await db.from("connected_accounts").select("id,creator_id,external_account_id").eq("platform", "twitch").eq("provider_status", "ready").not("external_account_id", "is", null);
  if (connectionsError) throw connectionsError;
  let created = 0, failed = 0;
  for (const connection of connections ?? []) {
    const { data: stored, error: storedError } = await db.from("platform_connection_secrets").select("access_token_ciphertext").eq("platform_connection_id", connection.id).maybeSingle();
    if (storedError) throw storedError;
    if (!stored || !connection.external_account_id) { failed++; continue; }
    const token = decryptSocialSecret(stored.access_token_ciphertext);
    for (const type of subscriptions) {
      const condition = type === "authorization.revoke" ? { user_id: connection.external_account_id } : { broadcaster_user_id: connection.external_account_id };
      try {
        const response = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Client-Id": clientId, "Content-Type": "application/json" }, body: JSON.stringify({ type, version: "1", condition, transport: { method: "webhook", callback, secret } }), signal: AbortSignal.timeout(8000) });
        if (response.status === 409) continue;
        if (!response.ok) { failed++; continue; }
        const id = extractSubscriptionId(await response.json()); if (!id) { failed++; continue; }
        const { error: persistError } = await db.from("twitch_eventsub_subscriptions").upsert({ creator_id: connection.creator_id, connected_account_id: connection.id, provider_subscription_id: id, subscription_type: type, subscription_version: "1", status: "pending", last_reconciled_at: new Date().toISOString(), next_reconcile_at: new Date(Date.now() + 24 * 60 * 60_000).toISOString() }, { onConflict: "provider_subscription_id" });
        if (persistError) throw persistError;
        created++;
      } catch { failed++; }
    }
  }
  return { configured: true, connections: connections?.length ?? 0, created, failed };
}

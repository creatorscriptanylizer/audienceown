import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@4";
import { cors, json, sha256 } from "../_shared/http.ts";

const schema = z.object({
  action: z.literal("revoke"),
  preferenceToken: z.string().min(20).max(200),
}).strict();

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const input = schema.parse(await request.json());
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: connection } = await admin.from("follower_connections")
      .select("id,follower_contact_id,selected_recovery_method_id,status,preference_token_expires_at,management_tokens_revoked_at")
      .eq("preference_token_hash", await sha256(input.preferenceToken))
      .maybeSingle();
    if (!connection
      || connection.management_tokens_revoked_at
      || !connection.preference_token_expires_at
      || new Date(connection.preference_token_expires_at).getTime() <= Date.now()) {
      return json({ status: "invalid" }, 400);
    }
    const { data: method } = await admin.from("follower_recovery_methods")
      .select("id,provider_identifier")
      .eq("id", connection.selected_recovery_method_id)
      .eq("follower_contact_id", connection.follower_contact_id)
      .eq("method_type", "web_push")
      .maybeSingle();
    if (!method) return json({ status: "not_browser_notification" }, 409);
    const now = new Date().toISOString();
    const [{ error: subscriptionError }, { error: methodError }, { error: connectionError }] =
      await Promise.all([
        admin.from("browser_push_subscriptions")
          .update({ revoked_at: now })
          .eq("recovery_method_id", method.id),
        admin.from("follower_recovery_methods")
          .update({ method_status: "revoked", provider_identifier: null })
          .eq("id", method.id),
        admin.from("follower_connections")
          .update({ selected_recovery_method_id: null })
          .eq("id", connection.id)
          .eq("selected_recovery_method_id", method.id),
      ]);
    if (subscriptionError || methodError || connectionError) throw new Error("revoke_failed");
    return json({ status: "revoked" });
  } catch {
    return json({ status: "invalid" }, 400);
  }
});

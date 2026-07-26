import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@4";
import { json, sha256 } from "../_shared/http.ts";

const preferencesSchema = z.object({
  recovery: z.literal(true),
  videos: z.boolean(),
  livestreams: z.boolean(),
  announcements: z.boolean(),
  products: z.boolean(),
}).strict();

const schema = z.object({
  token: z.string().min(20),
  preferences: preferencesSchema,
});

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const input = schema.parse(await request.json());
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: connection } = await admin
      .from("follower_connections")
      .select("id,status,preference_token_expires_at,management_tokens_revoked_at")
      .eq("preference_token_hash", await sha256(input.token))
      .maybeSingle();
    if (!connection || connection.management_tokens_revoked_at ||
      !connection.preference_token_expires_at ||
      new Date(connection.preference_token_expires_at).getTime() <= Date.now()) {
      return json({ status: "invalid" }, 400);
    }
    if (connection.status !== "active") return json({ status: "deactivated" }, 409);

    const categories = Object.entries(input.preferences).map(([category_key, enabled]) => ({
      follower_connection_id: connection.id,
      category_key,
      enabled,
    }));
    const [{ error: categoryError }, { error: legacyError }] = await Promise.all([
      admin.from("follower_category_preferences").upsert(categories, {
        onConflict: "follower_connection_id,category_key",
      }),
      admin.from("follower_notification_preferences").upsert({
        follower_connection_id: connection.id,
        important_account_updates: true,
        new_content: input.preferences.videos,
        creator_announcements: input.preferences.announcements,
      }),
    ]);
    if (categoryError || legacyError) throw categoryError ?? legacyError;
    return json({ status: "saved" });
  } catch {
    return json({ status: "invalid" }, 400);
  }
});

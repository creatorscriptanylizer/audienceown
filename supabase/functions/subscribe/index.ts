import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@4";
import { cors, json, sha256, token } from "../_shared/http.ts";

const sources = ["tiktok", "instagram", "youtube", "x", "facebook", "threads", "snapchat", "twitch", "linkedin", "spotify", "discord", "pinterest", "website", "direct", "other"] as const;
const preferenceSchema = z.object({
  recovery: z.literal(true),
  videos: z.boolean(),
  livestreams: z.boolean(),
  announcements: z.boolean(),
  products: z.boolean(),
}).strict();
const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048).refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:"
      || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
  }),
  expirationTime: z.number().int().positive().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(80).max(200).regex(/^[A-Za-z0-9_-]+$/),
    auth: z.string().min(16).max(64).regex(/^[A-Za-z0-9_-]+$/),
  }).strict(),
}).strict();
const schema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  email: z.string().email().transform((value) => value.trim().toLowerCase().normalize("NFKC")).optional(),
  subscription: subscriptionSchema.optional(),
  preferenceToken: z.string().min(20).max(200).optional(),
  consent: z.literal(true),
  source_platform: z.enum(sources).default("direct"),
  source_referrer: z.string().url().max(500).nullable().optional(),
  landing_path: z.string().max(300).optional(),
  preferences: preferenceSchema,
}).refine((value) => Boolean(value.email) !== Boolean(value.subscription), {
  message: "Exactly one recovery destination is required.",
});

async function encrypt(value: string, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey(
    "raw",
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)),
    "AES-GCM",
    false,
    ["encrypt"],
  );
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value)),
  );
  const output = new Uint8Array(iv.length + cipher.length);
  output.set(iv);
  output.set(cipher, iv.length);
  let raw = "";
  output.forEach((byte) => raw += String.fromCharCode(byte));
  return btoa(raw);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const input = schema.parse(await request.json());
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const secret = Deno.env.get("CONTACT_ENCRYPTION_KEY");
    if (!secret) return json({ error: "Not configured" }, 503);

    const { data: creator } = await admin.from("creators")
      .select("id,recovery_pass_enabled")
      .eq("public_slug", input.slug)
      .eq("public_profile_enabled", true)
      .maybeSingle();
    if (!creator?.recovery_pass_enabled) return json({ error: "Not found" }, 404);

    const endpointHash = input.subscription ? await sha256(input.subscription.endpoint) : null;
    const emailHash = input.email ? await sha256(input.email) : null;
    const masked = input.email ? input.email.replace(/^(.).+(@.+)$/, "$1••••$2") : "This browser";
    let contact: { id: string } | null = null;
    if (input.preferenceToken) {
      const { data: ownedConnection } = await admin.from("follower_connections")
        .select("follower_contact_id,preference_token_expires_at,management_tokens_revoked_at")
        .eq("creator_id", creator.id)
        .eq("preference_token_hash", await sha256(input.preferenceToken))
        .maybeSingle();
      if (!ownedConnection
        || ownedConnection.management_tokens_revoked_at
        || !ownedConnection.preference_token_expires_at
        || new Date(ownedConnection.preference_token_expires_at).getTime() <= Date.now()) {
        return json({ error: "Recovery Pass could not be activated" }, 403);
      }
      contact = { id: ownedConnection.follower_contact_id };
    }
    if (endpointHash) {
      const { data: existingSubscription } = await admin.from("browser_push_subscriptions")
        .select("recovery_method_id")
        .eq("endpoint_hash", endpointHash)
        .maybeSingle();
      if (existingSubscription) {
        const { data: method } = await admin.from("follower_recovery_methods")
          .select("follower_contact_id")
          .eq("id", existingSubscription.recovery_method_id)
          .single();
        contact = method ? { id: method.follower_contact_id } : null;
      }
    }
    if (!contact && input.email) {
      const { data, error } = await admin.from("follower_contacts")
        .upsert({
          email_hash: emailHash,
          email_ciphertext: await encrypt(input.email, secret),
          email_masked: masked,
        }, { onConflict: "email_hash" })
        .select("id")
        .single();
      if (error) throw error;
      contact = data;
    }
    if (!contact) {
      const { data, error } = await admin.from("follower_contacts").insert({}).select("id").single();
      if (error) throw error;
      contact = data;
    }

    const preferenceToken = token();
    const unsubscribeToken = token();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await admin.from("follower_connections")
      .select("id,source_platform,updated_at")
      .eq("creator_id", creator.id)
      .eq("follower_contact_id", contact.id)
      .maybeSingle();
    if (existing && Date.now() - new Date(existing.updated_at).getTime() < 5000) {
      throw new Error("rate_limited");
    }

    const connectionPayload = {
      creator_id: creator.id,
      follower_contact_id: contact.id,
      status: "active",
      consented_at: now,
      activated_at: now,
      deactivated_at: null,
      unsubscribed_at: null,
      preference_token_hash: await sha256(preferenceToken),
      unsubscribe_token_hash: await sha256(unsubscribeToken),
      preference_token_expires_at: expiresAt,
      unsubscribe_token_expires_at: expiresAt,
      management_tokens_revoked_at: null,
      consent_source: "creator_recovery_pass",
      ...(existing ? {} : {
        source_platform: input.source_platform,
        source_referrer: input.source_referrer ?? null,
        landing_path: input.landing_path ?? null,
      }),
    };
    const { data: connection, error: connectionError } = await admin.from("follower_connections")
      .upsert(connectionPayload, { onConflict: "creator_id,follower_contact_id" })
      .select("id")
      .single();
    if (connectionError) throw connectionError;

    const methodType = input.subscription ? "web_push" : "email";
    const { data: recoveryMethod, error: methodError } = await admin.from("follower_recovery_methods")
      .upsert({
        follower_contact_id: contact.id,
        method_type: methodType,
        method_status: "verified",
        destination_hash: endpointHash ?? emailHash,
        destination_masked: masked,
        verified_at: now,
        consented_at: now,
      }, { onConflict: "follower_contact_id,method_type,destination_hash" })
      .select("id")
      .single();
    if (methodError) throw methodError;
    if (input.subscription && endpointHash) {
      const { data: staleMethods } = await admin.from("follower_recovery_methods")
        .select("id")
        .eq("follower_contact_id", contact.id)
        .eq("method_type", "web_push")
        .neq("id", recoveryMethod.id)
        .eq("method_status", "verified");
      const staleIds = (staleMethods ?? []).map((method) => method.id);
      if (staleIds.length) {
        await Promise.all([
          admin.from("browser_push_subscriptions")
            .update({ revoked_at: now })
            .in("recovery_method_id", staleIds),
          admin.from("follower_recovery_methods")
            .update({ method_status: "revoked", provider_identifier: null })
            .in("id", staleIds),
        ]);
      }
      const { data: pushRecord, error: pushError } = await admin.from("browser_push_subscriptions")
        .upsert({
          recovery_method_id: recoveryMethod.id,
          endpoint_ciphertext: await encrypt(input.subscription.endpoint, secret),
          endpoint_hash: endpointHash,
          p256dh_ciphertext: await encrypt(input.subscription.keys.p256dh, secret),
          auth_ciphertext: await encrypt(input.subscription.keys.auth, secret),
          expiration_time: input.subscription.expirationTime
            ? new Date(input.subscription.expirationTime).toISOString()
            : null,
          user_agent_summary: request.headers.get("user-agent")?.slice(0, 200) ?? null,
          revoked_at: null,
          failure_count: 0,
        }, { onConflict: "endpoint_hash" })
        .select("id,recovery_method_id")
        .single();
      if (pushError || pushRecord?.recovery_method_id !== recoveryMethod.id) {
        throw pushError ?? new Error("subscription_owner_mismatch");
      }
      const { error: activateError } = await admin.from("follower_recovery_methods")
        .update({ method_status: "verified", provider_identifier: pushRecord.id, verified_at: now })
        .eq("id", recoveryMethod.id)
        .eq("follower_contact_id", contact.id);
      if (activateError) throw activateError;
    }

    const categoryRows = Object.entries(input.preferences).map(([category_key, enabled]) => ({
      follower_connection_id: connection.id,
      category_key,
      enabled,
    }));
    const [
      { error: selectedMethodError },
      { error: notificationPreferenceError },
      { error: categoryPreferenceError },
    ] = await Promise.all([
      admin.from("follower_connections")
        .update({ selected_recovery_method_id: recoveryMethod.id })
        .eq("id", connection.id),
      admin.from("follower_notification_preferences").upsert({
        follower_connection_id: connection.id,
        creator_announcements: input.preferences.announcements,
        new_content: input.preferences.videos,
        important_account_updates: true,
      }),
      admin.from("follower_category_preferences")
        .upsert(categoryRows, { onConflict: "follower_connection_id,category_key" }),
    ]);
    if (selectedMethodError || notificationPreferenceError || categoryPreferenceError) {
      throw selectedMethodError ?? notificationPreferenceError ?? categoryPreferenceError;
    }

    return json({ status: "activated", preferenceToken, unsubscribeToken });
  } catch {
    return json({ error: "Recovery Pass could not be activated" }, 400);
  }
});

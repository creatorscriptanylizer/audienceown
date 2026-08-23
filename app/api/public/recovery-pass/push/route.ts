import { createHash } from "node:crypto";
import { z } from "zod";
import { encryptContact, requireContactEncryptionKey } from "@/lib/contact-encryption";
import { debugError, debugLog } from "@/lib/debug";
import { readRecoverySession, sha256 } from "@/lib/recovery-pass-session";
import { createAdminClient } from "@/lib/supabase/admin";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const subscription = z.object({
  endpoint: z.string().url().max(2048).refine((value) => new URL(value).protocol === "https:"),
  expirationTime: z.number().int().positive().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(80).max(200).regex(/^[A-Za-z0-9_-]+$/),
    auth: z.string().min(16).max(64).regex(/^[A-Za-z0-9_-]+$/),
  }).strict(),
}).strict();
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("register"), slug, subscription }).strict(),
  z.object({ action: z.literal("disable"), slug }).strict(),
]);

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const token = await readRecoverySession(input.slug);
    const admin = createAdminClient();
    if (!token || !admin) return Response.json({ kind: "validation_error", message: "Your management session has expired." }, { status: 401 });
    const tokenHash = await sha256(token);
    const { data: creator } = await admin.from("creators").select("id").eq("public_slug", input.slug).eq("public_profile_enabled", true).eq("recovery_pass_enabled", true).maybeSingle();
    const { data: connection, error: connectionError } = creator ? await admin.from("follower_connections").select("id,follower_contact_id,status").eq("creator_id", creator.id).eq("preference_token_hash", tokenHash).is("management_tokens_revoked_at", null).gt("preference_token_expires_at", new Date().toISOString()).maybeSingle() : { data: null, error: null };
    if (connectionError) throw connectionError;
    if (!connection) return Response.json({ kind: "validation_error", message: "Verify your Email before enabling Push." }, { status: 401 });

    if (input.action === "disable") {
      const { data: methods, error } = await admin.from("follower_recovery_methods").select("id").eq("follower_contact_id", connection.follower_contact_id).eq("method_type", "web_push").eq("method_status", "verified");
      if (error) throw error;
      const methodIds = (methods ?? []).map((method) => method.id);
      if (methodIds.length) {
        const now = new Date().toISOString();
        const [subscriptionsResult, methodsResult] = await Promise.all([
          admin.from("browser_push_subscriptions").update({ revoked_at: now }).in("recovery_method_id", methodIds),
          admin.from("follower_recovery_methods").update({ method_status: "revoked", provider_identifier: null, consent_revoked_at: now, opt_out_reason: "follower_disabled_push" }).in("id", methodIds),
        ]);
        if (subscriptionsResult.error || methodsResult.error) throw subscriptionsResult.error ?? methodsResult.error;
      }
      debugLog("general", { event: "push_subscription_disabled", creatorSlug: input.slug, subscriptionCount: methodIds.length });
      return Response.json({ kind: "push_disabled" });
    }

    const encryptionKey = requireContactEncryptionKey();
    const endpointHash = createHash("sha256").update(input.subscription.endpoint).digest("hex");
    const now = new Date().toISOString();
    const { data: existingSubscription, error: existingError } = await admin.from("browser_push_subscriptions").select("recovery_method_id").eq("endpoint_hash", endpointHash).maybeSingle();
    if (existingError) throw existingError;
    let methodId = existingSubscription?.recovery_method_id;
    if (methodId) {
      const { data: owner } = await admin.from("follower_recovery_methods").select("follower_contact_id").eq("id", methodId).maybeSingle();
      if (owner?.follower_contact_id !== connection.follower_contact_id) return Response.json({ kind: "validation_error", message: "This Push subscription belongs to another connection." }, { status: 409 });
    } else {
      const { data: method, error } = await admin.from("follower_recovery_methods").insert({ follower_contact_id: connection.follower_contact_id, method_type: "web_push", method_status: "verified", destination_hash: endpointHash, destination_masked: "This device", verified_at: now, consented_at: now, consent_source: "recovery_pass_optional_updates" }).select("id").single();
      if (error) throw error;
      methodId = method.id;
    }
    const { data: pushRecord, error: pushError } = await admin.from("browser_push_subscriptions").upsert({ recovery_method_id: methodId, endpoint_ciphertext: await encryptContact(input.subscription.endpoint, encryptionKey), endpoint_hash: endpointHash, p256dh_ciphertext: await encryptContact(input.subscription.keys.p256dh, encryptionKey), auth_ciphertext: await encryptContact(input.subscription.keys.auth, encryptionKey), expiration_time: input.subscription.expirationTime ? new Date(input.subscription.expirationTime).toISOString() : null, user_agent_summary: request.headers.get("user-agent")?.slice(0, 200) ?? null, revoked_at: null, failure_count: 0 }, { onConflict: "endpoint_hash" }).select("id").single();
    if (pushError || !pushRecord) throw pushError ?? new Error("push_subscription_not_persisted");
    const { error: methodError } = await admin.from("follower_recovery_methods").update({ method_status: "verified", provider_identifier: pushRecord.id, verified_at: now, consent_revoked_at: null, opt_out_reason: null }).eq("id", methodId).eq("follower_contact_id", connection.follower_contact_id);
    if (methodError) throw methodError;
    debugLog("general", { event: "push_subscription_registered", creatorSlug: input.slug, connectionStatus: connection.status });
    return Response.json({ kind: "push_registered" });
  } catch (error) {
    debugError("general", error, { event: "push_subscription_failed" });
    return Response.json({ kind: "validation_error", message: "Push notifications could not be updated." }, { status: 400 });
  }
}

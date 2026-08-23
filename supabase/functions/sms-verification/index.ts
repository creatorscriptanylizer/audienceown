import { createClient } from "npm:@supabase/supabase-js@2";
import { parsePhoneNumberFromString } from "npm:libphonenumber-js@1.12.24/max";
import { z } from "npm:zod@4";
import { cors, json, sha256, token } from "../_shared/http.ts";

const sources = ["tiktok", "instagram", "youtube", "x", "facebook", "snapchat", "twitch", "linkedin", "spotify", "discord", "pinterest", "website", "direct", "other"] as const;
const preferences = z.object({
  recovery: z.literal(true),
  videos: z.boolean(),
  livestreams: z.boolean(),
  announcements: z.boolean(),
  products: z.boolean(),
}).strict();
const startSchema = z.object({
  action: z.literal("start"),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  phone: z.string().min(4).max(80),
  preferenceToken: z.string().min(20).max(200).optional(),
  country: z.string().length(2).regex(/^[A-Za-z]{2}$/).optional(),
  consent: z.literal(true),
  consentVersion: z.literal("sms-recovery-v1"),
  source_platform: z.enum(sources).default("direct"),
  source_referrer: z.string().url().max(500).nullable().optional(),
  landing_path: z.string().max(300).optional(),
  preferences,
}).strict();
const sessionSchema = z.object({
  action: z.enum(["verify", "resend", "cancel"]),
  sessionToken: z.string().min(20).max(200),
  code: z.string().regex(/^[0-9]{6}$/).optional(),
}).strict();
const removeSchema = z.object({
  action: z.literal("remove"),
  preferenceToken: z.string().min(20).max(200),
}).strict();
const inputSchema = z.union([startSchema, sessionSchema, removeSchema]);

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
  return btoa(String.fromCharCode(...output));
}

function normalizePhone(value: string, country?: string) {
  try {
    const phone = parsePhoneNumberFromString(value.trim().normalize("NFKC"), country?.toUpperCase() as never);
    if (!phone?.isPossible() || !phone.isValid()) return null;
    return phone.number;
  } catch {
    return null;
  }
}

function twilioConfiguration() {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const serviceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");
  return accountSid && /^AC[a-fA-F0-9]{32}$/.test(accountSid)
    && authToken && authToken.length >= 20
    && !/^(placeholder|changeme|example|test|your[-_])/i.test(authToken)
    && serviceSid && /^VA[a-fA-F0-9]{32}$/.test(serviceSid)
    ? { accountSid, authToken, serviceSid }
    : null;
}

async function twilioVerifyRequest(path: string, body: URLSearchParams) {
  const config = twilioConfiguration();
  if (!config) return { ok: false as const, code: "provider_unavailable" as const };
  try {
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${encodeURIComponent(config.serviceSid)}/${path}`,
      {
        method: "POST",
        headers: {
          authorization: `Basic ${btoa(`${config.accountSid}:${config.authToken}`)}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );
    const data = await response.json() as { sid?: string; status?: string; code?: number };
    if (response.ok) return { ok: true as const, data };
    if (response.status === 429) return { ok: false as const, code: "rate_limited" as const };
    if ([60202, 60203].includes(data.code ?? 0)) {
      return { ok: false as const, code: "too_many_attempts" as const };
    }
    return { ok: false as const, code: "provider_unavailable" as const };
  } catch {
    return { ok: false as const, code: "provider_unavailable" as const };
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return json({ status: "invalid_request" }, 405);
  try {
    const input = inputSchema.parse(await request.json());
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const encryptionKey = Deno.env.get("CONTACT_ENCRYPTION_KEY");
    if (!encryptionKey || encryptionKey.length < 20) {
      return json({ status: "provider_unavailable" }, 503);
    }
    const now = new Date();

    if (input.action === "start") {
      if (!input.phone.trim().startsWith("+") && !input.country) {
        return json({ status: "invalid_phone" }, 400);
      }
      const e164 = normalizePhone(input.phone, input.country);
      if (!e164) return json({ status: "invalid_phone" }, 400);
      const { data: creator } = await admin.from("creators")
        .select("id,recovery_pass_enabled")
        .eq("public_slug", input.slug)
        .eq("public_profile_enabled", true)
        .maybeSingle();
      if (!creator?.recovery_pass_enabled) return json({ status: "invalid_phone" }, 400);

      const destinationHash = await sha256(e164);
      const masked = `•••• •••• ${e164.slice(-4)}`;
      const { data: managedConnection } = input.preferenceToken
        ? await admin.from("follower_connections")
          .select("id,follower_contact_id")
          .eq("creator_id", creator.id)
          .eq("preference_token_hash", await sha256(input.preferenceToken))
          .is("management_tokens_revoked_at", null)
          .gt("preference_token_expires_at", now.toISOString())
          .maybeSingle()
        : { data: null };
      let { data: contact } = await admin.from("follower_contacts")
        .select("id").eq("phone_hash", destinationHash).maybeSingle();
      if (!contact) {
        const created = await admin.from("follower_contacts").insert({
          phone_ciphertext: await encrypt(e164, encryptionKey),
          phone_hash: destinationHash,
          phone_masked: masked,
        }).select("id").single();
        if (created.error) throw created.error;
        contact = created.data;
      }
      const { data: existingMethod } = await admin.from("follower_recovery_methods")
        .select("id,method_status")
        .eq("follower_contact_id", contact.id)
        .eq("method_type", "sms")
        .eq("destination_hash", destinationHash)
        .maybeSingle();
      let method = existingMethod;
      if (!method || method.method_status !== "verified") {
        const pendingMethod = await admin.from("follower_recovery_methods")
          .upsert({
            follower_contact_id: contact.id,
            method_type: "sms",
            method_status: "pending",
            destination_hash: destinationHash,
            destination_masked: masked,
            verified_at: null,
            consented_at: now.toISOString(),
            consent_purpose: "recovery_alerts",
            consent_version: input.consentVersion,
            consent_source: "creator_recovery_pass",
          opted_out_at: null,
          opt_out_reason: null,
          consent_revoked_at: null,
          }, { onConflict: "follower_contact_id,method_type,destination_hash" })
          .select("id,method_status")
          .single();
        if (pendingMethod.error) throw pendingMethod.error;
        method = pendingMethod.data;
      }
      if (!method) throw new Error("method_unavailable");

      const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
      const ipSecret = Deno.env.get("IP_HASH_SECRET") ?? "";
      const ipHash = forwarded && ipSecret ? await sha256(`${ipSecret}:${forwarded}`) : null;
      const since = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const [{ count: destinationCount }, { count: ipCount }] = await Promise.all([
        admin.from("sms_verification_sessions").select("*", { count: "exact", head: true })
          .eq("recovery_method_id", method.id).gte("created_at", since),
        ipHash
          ? admin.from("sms_verification_sessions").select("*", { count: "exact", head: true })
            .eq("source_ip_hash", ipHash).gte("created_at", since)
          : Promise.resolve({ count: 0 }),
      ]);
      if ((destinationCount ?? 0) >= 5 || (ipCount ?? 0) >= 10) {
        return json({ status: "rate_limited" }, 429);
      }
      await admin.from("sms_verification_sessions")
        .update({ replaced_at: now.toISOString() })
        .eq("recovery_method_id", method.id)
        .is("completed_at", null)
        .is("replaced_at", null);

      const sent = await twilioVerifyRequest("Verifications", new URLSearchParams({
        To: e164,
        Channel: "sms",
      }));
      if (!sent.ok) return json({ status: sent.code }, sent.code === "rate_limited" ? 429 : 503);
      const sessionToken = token();
      const { error } = await admin.from("sms_verification_sessions").insert({
        recovery_method_id: method.id,
        creator_id: creator.id,
        follower_connection_id: managedConnection?.id ?? null,
        session_token_hash: await sha256(sessionToken),
        provider_verification_id: sent.data.sid ?? null,
        source_ip_hash: ipHash,
        preferences: input.preferences,
        source_platform: input.source_platform,
        source_referrer: input.source_referrer ?? null,
        landing_path: input.landing_path ?? null,
        expires_at: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
        resend_available_at: new Date(now.getTime() + 30 * 1000).toISOString(),
      });
      if (error) throw error;
      return json({ status: "code_sent", sessionToken, maskedPhone: masked, resendAfterSeconds: 30 });
    }

    if (input.action === "remove") {
      const { data: connection } = await admin.from("follower_connections")
        .select("id,follower_contact_id,selected_recovery_method_id,preference_token_expires_at,management_tokens_revoked_at")
        .eq("preference_token_hash", await sha256(input.preferenceToken))
        .maybeSingle();
      if (!connection || connection.management_tokens_revoked_at
        || !connection.preference_token_expires_at
        || new Date(connection.preference_token_expires_at) <= now) {
        return json({ status: "invalid" }, 400);
      }
      const { data: method } = await admin.from("follower_recovery_methods")
        .select("id").eq("id", connection.selected_recovery_method_id)
        .eq("follower_contact_id", connection.follower_contact_id)
        .eq("method_type", "sms").maybeSingle();
      if (!method) return json({ status: "removed" });
      await admin.from("follower_connections").update({ selected_recovery_method_id: null })
        .eq("id", connection.id).eq("selected_recovery_method_id", method.id);
      await admin.from("follower_recovery_methods").update({
        method_status: "revoked",
        opt_out_reason: "follower_removed",
        consent_revoked_at: now.toISOString(),
      }).eq("id", method.id);
      await admin.from("sms_verification_sessions").update({ replaced_at: now.toISOString() })
        .eq("recovery_method_id", method.id).is("completed_at", null).is("replaced_at", null);
      return json({ status: "removed" });
    }

    const { data: session } = await admin.from("sms_verification_sessions")
      .select("id,recovery_method_id,creator_id,expires_at,resend_available_at,resend_count,attempt_count,completed_at,replaced_at,preferences,source_platform,source_referrer,landing_path,follower_recovery_methods(follower_contact_id,destination_hash,destination_masked)")
      .eq("session_token_hash", await sha256(input.sessionToken)).maybeSingle();
    if (!session || session.completed_at || session.replaced_at) return json({ status: "expired_code" }, 410);
    if (new Date(session.expires_at) <= now) return json({ status: "expired_code" }, 410);
    const method = session.follower_recovery_methods as unknown as {
      follower_contact_id: string;
      destination_hash: string;
      destination_masked: string;
    };
    const { data: contact } = await admin.from("follower_contacts")
      .select("phone_ciphertext").eq("id", method.follower_contact_id).single();
    if (!contact?.phone_ciphertext) return json({ status: "expired_code" }, 410);

    if (input.action === "cancel") {
      await admin.from("sms_verification_sessions").update({ replaced_at: now.toISOString() })
        .eq("id", session.id);
      return json({ status: "cancelled" });
    }
    if (input.action === "resend") {
      if (new Date(session.resend_available_at) > now || session.resend_count >= 3) {
        return json({ status: "rate_limited" }, 429);
      }
      const phone = await decrypt(contact.phone_ciphertext, encryptionKey);
      const sent = await twilioVerifyRequest("Verifications", new URLSearchParams({ To: phone, Channel: "sms" }));
      if (!sent.ok) return json({ status: sent.code }, 503);
      await admin.from("sms_verification_sessions").update({
        resend_count: session.resend_count + 1,
        resend_available_at: new Date(now.getTime() + 30 * 1000).toISOString(),
      }).eq("id", session.id);
      return json({ status: "code_sent", maskedPhone: method.destination_masked, resendAfterSeconds: 30 });
    }
    if (!input.code || session.attempt_count >= 6) return json({ status: "too_many_attempts" }, 429);
    await admin.from("sms_verification_sessions")
      .update({ attempt_count: session.attempt_count + 1 }).eq("id", session.id);
    const phone = await decrypt(contact.phone_ciphertext, encryptionKey);
    const checked = await twilioVerifyRequest("VerificationCheck", new URLSearchParams({
      To: phone,
      Code: input.code,
    }));
    if (!checked.ok) return json({ status: checked.code }, checked.code === "too_many_attempts" ? 429 : 503);
    if (checked.data.status !== "approved") return json({ status: "invalid_code" }, 400);

    const preferenceToken = token();
    const unsubscribeToken = token();
    const expires = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const { error: activationError } = await admin.rpc("activate_sms_recovery_pass", {
      p_session_id: session.id,
      p_preference_token_hash: await sha256(preferenceToken),
      p_unsubscribe_token_hash: await sha256(unsubscribeToken),
      p_token_expires_at: expires,
    });
    if (activationError) throw activationError;
    return json({
      status: "verified",
      maskedPhone: method.destination_masked,
      preferenceToken,
      unsubscribeToken,
    });
  } catch {
    return json({ status: "invalid_request" }, 400);
  }
});

async function decrypt(ciphertext: string, secret: string) {
  const packed = Uint8Array.from(atob(ciphertext), (character) => character.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "raw",
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)),
    "AES-GCM",
    false,
    ["decrypt"],
  );
  const value = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: packed.slice(0, 12) },
    key,
    packed.slice(12),
  );
  return new TextDecoder().decode(value);
}

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptContact, requireContactEncryptionKey } from "@/lib/contact-encryption";
import { normaliseSource } from "@/lib/recovery-pass";
import { readRecoverySession, RECOVERY_SESSION_MAX_AGE, setRecoverySession, sha256 } from "@/lib/recovery-pass-session";
import { debugEmailVerification, debugError, debugLog } from "@/lib/debug";

const startSchema = z.object({ action: z.enum(["start", "resend"]), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), email: z.string().email().max(254), challengeId: z.string().uuid().optional(), preferenceToken: z.string().min(20).max(200).optional(), source: z.string().optional(), landingPath: z.string().max(300).optional() }).strict();
const verifySchema = z.object({ action: z.literal("verify"), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), challengeId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) }).strict();
const inputSchema = z.union([startSchema, verifySchema]);
const response = (body: object, status = 200) => Response.json(body, { status });
const maskEmail = (email: string) => email.replace(/^(.)(.*)(@.+)$/, (_, first: string, middle: string, domain: string) => `${first}${"•".repeat(Math.min(5, Math.max(3, middle.length)))}${domain}`);
const codeHash = (challengeId: string, code: string) => createHash("sha256").update(`${process.env.EMAIL_OTP_PEPPER}:${challengeId}:${code}`).digest("hex");
type EmailVerificationUnavailableReason = "database_admin_not_configured" | "email_otp_pepper_not_configured" | "email_provider_not_configured" | "email_sender_not_configured" | "provider_rejected";

function unavailableReason(adminReady: boolean, pepper: string | undefined, resendKey: string | undefined, from: string | undefined): EmailVerificationUnavailableReason | null {
  if (!adminReady) return "database_admin_not_configured";
  if (!pepper || pepper.length < 20) return "email_otp_pepper_not_configured";
  if (!resendKey) return "email_provider_not_configured";
  if (!from) return "email_sender_not_configured";
  return null;
}

function diagnostic(overrides: Partial<Record<"requestValid" | "enrollmentCredentialValid" | "emailNormalized" | "encryptionReady" | "providerConfigured" | "challengeCreated" | "persistenceSucceeded" | "providerRequestAttempted" | "providerRequestSucceeded", boolean>> & { stage: string; result: string }) {
  debugEmailVerification({
    stage: overrides.stage,
    requestValid: overrides.requestValid ?? false,
    enrollmentCredentialValid: overrides.enrollmentCredentialValid ?? false,
    emailNormalized: overrides.emailNormalized ?? false,
    encryptionReady: overrides.encryptionReady ?? false,
    providerConfigured: overrides.providerConfigured ?? false,
    challengeCreated: overrides.challengeCreated ?? false,
    persistenceSucceeded: overrides.persistenceSucceeded ?? false,
    providerRequestAttempted: overrides.providerRequestAttempted ?? false,
    providerRequestSucceeded: overrides.providerRequestSucceeded ?? false,
    result: overrides.result,
  });
}

export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json());
    const admin = createAdminClient();
    const pepper = process.env.EMAIL_OTP_PEPPER;
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.DELIVERY_EMAIL_FROM ?? process.env.RESEND_FROM_EMAIL;
    const configurationFailure = unavailableReason(Boolean(admin), pepper, resendKey, from);
    if (configurationFailure) {
      diagnostic({ stage: "configuration", requestValid: true, encryptionReady: Boolean(process.env.CONTACT_ENCRYPTION_KEY && process.env.CONTACT_ENCRYPTION_KEY.length >= 20), providerConfigured: Boolean(resendKey && from), result: configurationFailure });
      return response({ kind: "verification_unavailable", reason: configurationFailure, message: "Email verification is temporarily unavailable." }, 503);
    }
    if (input.action === "verify") {
      const { data: challenge } = await admin.from("email_verification_challenges" as never).select("id,creator_id,code_hash,expires_at,attempt_count,verified_at,completed_at,cancelled_at,replaced_at" as never).eq("id" as never, input.challengeId as never).maybeSingle() as unknown as { data: Record<string, unknown> | null };
      if (!challenge || challenge.completed_at || challenge.cancelled_at || challenge.replaced_at || challenge.verified_at || new Date(String(challenge.expires_at)) <= new Date()) return response({ kind: "validation_error", code: "expired", message: "This verification code has expired. Request a new code to continue." }, 400);
      const attempts = Number(challenge.attempt_count ?? 0);
      if (attempts >= 6) return response({ kind: "rate_limited", message: "Too many attempts. Request a new code." }, 429);
      await admin.from("email_verification_challenges" as never).update({ attempt_count: attempts + 1 } as never).eq("id" as never, input.challengeId as never);
      const expected = Buffer.from(String(challenge.code_hash), "hex");
      const supplied = Buffer.from(codeHash(input.challengeId, input.code), "hex");
      if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return response({ kind: "validation_error", code: "incorrect_code", message: "That code doesn't match. Check the code in your Email and try again." }, 400);
      const now = new Date().toISOString();
      const verified = await admin.from("email_verification_challenges" as never).update({ verified_at: now } as never).eq("id" as never, input.challengeId as never).is("verified_at" as never, null).is("completed_at" as never, null).select("id" as never).maybeSingle();
      if (verified.error || !verified.data) return response({ kind: "validation_error", code: "already_used", message: "That code has already been used." }, 409);
      const preferenceToken = crypto.randomUUID() + crypto.randomUUID();
      const unsubscribeToken = crypto.randomUUID() + crypto.randomUUID();
      const expiresAt = new Date(Date.now() + RECOVERY_SESSION_MAX_AGE * 1000).toISOString();
      const completed = await admin.rpc("complete_email_recovery_verification" as never, { p_challenge_id: input.challengeId, p_preference_token_hash: await sha256(preferenceToken), p_unsubscribe_token_hash: await sha256(unsubscribeToken), p_token_expires_at: expiresAt } as never) as unknown as { data: unknown; error: unknown };
      if (completed.error) return response({ kind: "system_error", message: "Email verification could not be completed." }, 500);
      await setRecoverySession(input.slug, preferenceToken);
      debugLog("general", { event: "recovery_email_verification_succeeded", creatorSlug: input.slug });
      return response({ kind: "verified", method: "email", preferenceToken, unsubscribeToken });
    }

    const email = input.email.trim().toLowerCase().normalize("NFKC");
    const emailHash = await sha256(email);
    const { data: creator } = await admin.from("creators").select("id,display_name").eq("public_slug", input.slug).eq("public_profile_enabled", true).eq("recovery_pass_enabled", true).maybeSingle();
    if (!creator) return response({ kind: "validation_error", message: "Recovery Pass is unavailable." }, 404);
    const managementToken = await readRecoverySession(input.slug) ?? input.preferenceToken;
    const { data: managedConnection } = managementToken ? await admin.from("follower_connections").select("id").eq("creator_id", creator.id).eq("preference_token_hash", await sha256(managementToken)).is("management_tokens_revoked_at", null).gt("preference_token_expires_at", new Date().toISOString()).maybeSingle() : { data: null };
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ipHash = await sha256(`${process.env.IP_HASH_SECRET ?? pepper}:${forwarded}`);
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const [{ count: emailCount }, { count: ipCount }] = await Promise.all([
      admin.from("email_verification_challenges" as never).select("*" as never, { count: "exact", head: true }).eq("email_hash" as never, emailHash as never).gte("created_at" as never, since as never),
      admin.from("email_verification_challenges" as never).select("*" as never, { count: "exact", head: true }).eq("source_ip_hash" as never, ipHash as never).gte("created_at" as never, since as never),
    ]);
    if ((emailCount ?? 0) >= 5 || (ipCount ?? 0) >= 12) return response({ kind: "rate_limited", message: "Please wait before requesting another code." }, 429);
    if (input.action === "resend" && input.challengeId) {
      const { data: previous } = await admin.from("email_verification_challenges" as never).select("resend_available_at,resend_count" as never).eq("id" as never, input.challengeId as never).eq("creator_id" as never, creator.id as never).eq("email_hash" as never, emailHash as never).maybeSingle() as unknown as { data: Record<string, unknown> | null };
      if (!previous || new Date(String(previous.resend_available_at)) > new Date() || Number(previous.resend_count) >= 3) return response({ kind: "rate_limited", message: "Please wait before requesting another code." }, 429);
    }
    await admin.from("email_verification_challenges" as never).update({ replaced_at: new Date().toISOString() } as never).eq("creator_id" as never, creator.id as never).eq("email_hash" as never, emailHash as never).is("completed_at" as never, null).is("cancelled_at" as never, null).is("replaced_at" as never, null);
    const challengeId = crypto.randomUUID();
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const now = Date.now();
    const inserted = await admin.from("email_verification_challenges" as never).insert({ id: challengeId, creator_id: creator.id, follower_connection_id: managedConnection?.id ?? null, email_hash: emailHash, email_ciphertext: await encryptContact(email, requireContactEncryptionKey()), email_masked: maskEmail(email), code_hash: codeHash(challengeId, code), source_ip_hash: ipHash, source_platform: normaliseSource(input.source), landing_path: input.landingPath ?? null, expires_at: new Date(now + 10 * 60_000).toISOString(), resend_available_at: new Date(now + 30_000).toISOString(), resend_count: input.action === "resend" ? 1 : 0 } as never);
    if (inserted.error) return response({ kind: "system_error", message: "A verification code could not be created." }, 500);
    const sent = await new Resend(resendKey!).emails.send({ from: from!, to: email, subject: `Your ${creator.display_name} Recovery Pass verification code`, html: `<p>Your AudienceOwn verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>` });
    if (sent.error) {
      await admin.from("email_verification_challenges" as never).update({ cancelled_at: new Date().toISOString() } as never).eq("id" as never, challengeId as never);
      diagnostic({ stage: "provider_delivery", requestValid: true, enrollmentCredentialValid: Boolean(managedConnection), emailNormalized: true, encryptionReady: true, providerConfigured: true, challengeCreated: true, persistenceSucceeded: true, providerRequestAttempted: true, providerRequestSucceeded: false, result: "provider_rejected" });
      return response({ kind: "verification_unavailable", reason: "provider_rejected", message: "The verification email could not be sent." }, 503);
    }
    diagnostic({ stage: "complete", requestValid: true, enrollmentCredentialValid: Boolean(managedConnection), emailNormalized: true, encryptionReady: true, providerConfigured: true, challengeCreated: true, persistenceSucceeded: true, providerRequestAttempted: true, providerRequestSucceeded: true, result: "verification_sent" });
    debugLog("general", { event: "recovery_email_verification_requested", creatorSlug: input.slug, resend: input.action === "resend" });
    return response({ kind: "verification_sent", challengeId, masked: maskEmail(email), resendAfterSeconds: 30 });
  } catch (error) {
    debugError("general", error, { event: "recovery_email_verification_failed" });
    return response({ kind: "validation_error", message: "Check the verification details and try again." }, 400);
  }
}

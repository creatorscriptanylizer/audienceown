import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { readRecoverySession, recoverySessionCookieOptions, setRecoverySession, sha256 } from "@/lib/recovery-pass-session";
import { debugError, debugLog, debugRecoveryMember } from "@/lib/debug";

const schema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  preferenceToken: z.string().min(20).max(200).optional(),
  accountReferences: z.array(z.string().length(64).regex(/^[a-f0-9]+$/)).min(1).max(50),
  recoveryAlerts: z.literal(true),
  preferences: z.array(z.enum(["videos", "livestreams", "podcasts", "products", "events", "announcements"])).max(6),
}).strict();

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    // The explicit token may be newer when a replacement email was verified after
    // the HttpOnly cookie was issued and the canonical connection rotated it.
    const preferenceToken = input.preferenceToken ?? await readRecoverySession(input.slug);
    if (!preferenceToken) return Response.json({ kind: "validation_error", message: "Verify a delivery method first." }, { status: 401 });
    const admin = createAdminClient();
    if (!admin) return Response.json({ kind: "system_error", message: "Recovery Pass is temporarily unavailable." }, { status: 503 });
    const hash = await sha256(preferenceToken);
    const { data: creator, error: creatorError } = await admin.from("creators").select("id").eq("public_slug", input.slug).eq("public_profile_enabled", true).eq("recovery_pass_enabled", true).maybeSingle();
    if (creatorError) throw creatorError;
    const { data: connection, error: connectionError } = creator ? await admin.from("follower_connections").select("id,follower_contact_id,status").eq("creator_id", creator.id).eq("preference_token_hash", hash).is("management_tokens_revoked_at", null).gt("preference_token_expires_at", new Date().toISOString()).maybeSingle() : { data: null, error: null };
    if (connectionError) throw connectionError;
    const { data: verifiedEmail, error: emailError } = connection ? await admin.from("follower_recovery_methods").select("id").eq("follower_contact_id", connection.follower_contact_id).eq("method_type", "email").eq("method_status", "verified").maybeSingle() : { data: null, error: null };
    if (emailError) throw emailError;
    if (!connection || (connection.status !== "active" && !verifiedEmail)) return Response.json({ kind: "validation_error", message: "Verify your email address first." }, { status: 401 });
    debugLog("general", { event: "recovery_pass_activation_started", creatorSlug: input.slug, selectedAccountCount: input.accountReferences.length });
    const { data, error } = await admin.rpc("activate_public_recovery_pass" as never, {
      p_slug: input.slug,
      p_preference_token_hash: hash,
      p_account_references: input.accountReferences,
      p_optional_preferences: input.preferences,
    } as never) as unknown as { data: unknown; error: { message?: string } | null };
    if (error || !data) { debugError("general", error, { event: "recovery_pass_activation_rejected", creatorSlug: input.slug }); return Response.json({ kind: "validation_error", message: "Your verified connection could not be activated." }, { status: 400 }); }
    await setRecoverySession(input.slug, preferenceToken);
    const cookie = recoverySessionCookieOptions();
    debugRecoveryMember({
      event: "activation_completed",
      membershipActive: true,
      managementCredentialCreated: true,
      managementCookieSet: true,
      cookieSecure: cookie.secure,
      cookieHttpOnly: cookie.httpOnly,
      cookieSameSite: cookie.sameSite,
      cookiePath: cookie.path,
      cookieDomainConfigured: false,
    });
    debugLog("general", { event: "recovery_pass_activation_succeeded", creatorSlug: input.slug });
    return Response.json({ kind: "activation_success", status: "active", result: data });
  } catch (error) {
    debugError("general", error, { event: "recovery_pass_activation_failed" });
    return Response.json({ kind: "validation_error", message: "Check your selections and try again." }, { status: 400 });
  }
}

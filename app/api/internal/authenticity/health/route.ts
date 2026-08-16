import { timingSafeEqual } from "node:crypto";
import { firstDatabaseFailure } from "@/lib/api-unavailable";
import { signingConfig } from "@/lib/authenticity/signing";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const expected = process.env.AUTHENTICITY_WORKER_SECRET;
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !actual || expected.length !== actual.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = createAdminClient();
  if (!db) return Response.json({ error: "Unavailable" }, { status: 503 });
  const now = new Date(), near = new Date(now.getTime() + 30 * 60_000);
  const [enabledResult, profilesResult, assertionsResult, keysResult] = await Promise.all([
    db.from("creator_authenticity_profiles").select("*", { count: "exact", head: true }).eq("display_enabled", true),
    db.from("creator_authenticity_profiles").select("id,presentation_revision,issuance_lease_expires_at,updated_at"),
    db.from("creator_authenticity_assertions").select("authenticity_profile_id,presentation_revision,expires_at,revoked_at,superseded_at,key_id").is("revoked_at", null).is("superseded_at", null),
    db.from("authenticity_signing_keys").select("key_id,active,revoked_at,retire_after"),
  ]);
  const failure = firstDatabaseFailure("internal_authenticity_health", [
    ["enabled_profiles", enabledResult.error], ["authenticity_profiles", profilesResult.error],
    ["authenticity_assertions", assertionsResult.error], ["authenticity_signing_keys", keysResult.error],
  ]);
  if (failure) return failure;
  const enabled = enabledResult.count, profiles = profilesResult.data ?? [], assertions = assertionsResult.data ?? [], keys = keysResult.data ?? [];
  const current = new Map(assertions.map((assertion) => [assertion.authenticity_profile_id, assertion]));
  return Response.json({
    enabledProfiles: enabled ?? 0,
    profilesMissingCurrentAssertion: profiles.filter((profile) => !current.has(profile.id)).length,
    assertionsNearExpiry: assertions.filter((assertion) => new Date(assertion.expires_at) > now && new Date(assertion.expires_at) <= near).length,
    expiredAssertions: assertions.filter((assertion) => new Date(assertion.expires_at) <= now).length,
    signingConfigured: Boolean(signingConfig()),
    stalePresentationRevisions: profiles.filter((profile) => current.get(profile.id)?.presentation_revision !== profile.presentation_revision).length,
    keyRotation: { published: keys.length, active: keys.filter((key) => key.active && !key.revoked_at).map((key) => key.key_id), revoked: keys.filter((key) => key.revoked_at).length },
    oldestPendingIssuance: profiles.filter((profile) => !current.has(profile.id) || current.get(profile.id)?.presentation_revision !== profile.presentation_revision).sort((a, b) => a.updated_at.localeCompare(b.updated_at))[0]?.updated_at ?? null,
  }, { headers: { "cache-control": "no-store" } });
}

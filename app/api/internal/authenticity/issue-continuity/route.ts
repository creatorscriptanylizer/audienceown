import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertionHash, signPortablePayload, signingConfig } from "@/lib/authenticity/signing";
import { publicBaseUrl } from "@/lib/authenticity/public";
import type { ContinuityPayload } from "@/lib/authenticity/network-types";

function authorized(request: Request) { const expected = process.env.AUTHENTICITY_CONTINUITY_WORKER_SECRET ?? process.env.AUTHENTICITY_NETWORK_WORKER_SECRET, actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""); return Boolean(expected && actual && expected.length === actual.length && timingSafeEqual(Buffer.from(expected), Buffer.from(actual))); }
const unavailable = () => Response.json({ error: "Temporarily unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = createAdminClient(), config = signingConfig();
  if (!db || !config) return unavailable();
  const limit = Math.min(100, Math.max(1, Number(process.env.AUTHENTICITY_NETWORK_BATCH_SIZE ?? 20) || 20));
  const { data: relationships, error: relationshipsError } = await db.from("creator_identity_relationships").select("id,creator_id,identity_profile_id,source_account_id,target_account_id,relationship_type,verified_at,creator_identity_profiles(identity_revision),source:creator_identity_accounts!creator_identity_relationships_source_account_id_fkey(id,provider,canonical_profile_url,verification_status),target:creator_identity_accounts!creator_identity_relationships_target_account_id_fkey(id,provider,canonical_profile_url,verification_status)").eq("status", "active").in("relationship_type", ["replacement_for", "migrated_from", "migrated_to", "emergency_replacement_for"]).limit(limit);
  if (relationshipsError) return unavailable();
  let issued = 0, skipped = 0, failed = 0;
  for (const rel of relationships ?? []) {
    try {
      const source = Array.isArray(rel.source) ? rel.source[0] : rel.source, target = Array.isArray(rel.target) ? rel.target[0] : rel.target;
      if (!source || !target || target.verification_status !== "verified") { skipped++; continue; }
      const { data: profile, error: profileError } = await db.from("creator_authenticity_profiles").select("id,public_slug").eq("identity_profile_id", rel.identity_profile_id).eq("display_enabled", true).maybeSingle();
      if (profileError) throw profileError;
      const identity = Array.isArray(rel.creator_identity_profiles) ? rel.creator_identity_profiles[0] : rel.creator_identity_profiles;
      if (!profile || !identity) { skipped++; continue; }
      const type = rel.relationship_type.includes("migrated") ? "account_migrated" : rel.relationship_type === "emergency_replacement_for" ? "emergency_replacement_activated" : "account_replaced";
      const reason = type === "account_migrated" ? "authoritative_migration" : type === "account_replaced" ? "verified_replacement" : "verified_emergency_activation";
      const now = new Date(), expires = new Date(now.getTime() + 365 * 24 * 60 * 60_000);
      const payload: ContinuityPayload = { version: "audienceown-continuity-v1", issuer: publicBaseUrl(), creator: { slug: profile.public_slug, verificationUrl: `${publicBaseUrl()}/verify/${profile.public_slug}` }, statementType: type, provider: target.provider, previousUrl: source.canonical_profile_url, currentUrl: target.canonical_profile_url, reasonCode: reason, identityRevision: identity.identity_revision, issuedAt: now.toISOString(), expiresAt: expires.toISOString() };
      const signed = signPortablePayload(payload, "audienceown-continuity+jws", config);
      if (!signed) throw new Error("signing unavailable");
      const { error } = await db.rpc("store_continuity_statement", { p_profile_id: profile.id, p_statement_type: type, p_provider: target.provider, p_previous_account_id: source.id, p_current_account_id: target.id, p_previous_url: source.canonical_profile_url, p_current_url: target.canonical_profile_url, p_reason_code: reason, p_source_revision: identity.identity_revision, p_payload: payload, p_payload_hash: assertionHash(payload as never), p_key_id: config.keyId, p_signature: signed.signature, p_issued_at: payload.issuedAt, p_expires_at: payload.expiresAt });
      if (error) throw error;
      issued++;
    } catch { failed++; }
  }
  return Response.json({ examined: relationships?.length ?? 0, issued, skipped, failed, keyId: config.keyId }, { headers: { "cache-control": "no-store" } });
}

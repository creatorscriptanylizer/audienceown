import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertionHash } from "@/lib/authenticity/signing";
import { buildAuthenticityManifest } from "@/lib/authenticity/manifest";
import { getPublicAuthenticity } from "@/lib/authenticity/server";
import { queueAuthenticityNetworkEvent } from "@/lib/authenticity/webhook-events";

function authorized(request: Request) {
  const expected = process.env.AUTHENTICITY_NETWORK_WORKER_SECRET;
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(expected && actual && expected.length === actual.length && timingSafeEqual(Buffer.from(expected), Buffer.from(actual)));
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = createAdminClient();
  if (!db) return Response.json({ error: "Unavailable" }, { status: 503 });
  const limit = Math.min(100, Math.max(1, Number(process.env.AUTHENTICITY_NETWORK_BATCH_SIZE ?? 20) || 20));
  const { data: profiles, error: profilesError } = await db.from("creator_authenticity_profiles")
    .select("id,creator_id,identity_profile_id,public_slug,presentation_revision,creator_identity_profiles(identity_revision)")
    .eq("display_enabled", true).limit(limit);
  if (profilesError) return Response.json({ error: "Temporarily unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  let stored = 0, skipped = 0, failed = 0, deliveries = 0;
  for (const profile of profiles ?? []) {
    try {
      const identity = Array.isArray(profile.creator_identity_profiles) ? profile.creator_identity_profiles[0] : profile.creator_identity_profiles;
      const result = await getPublicAuthenticity(profile.public_slug);
      if (!identity || result.status === "absent") { skipped++; continue; }
      if (result.status === "unavailable") throw new Error("public authenticity unavailable");
      const record = result.data;
      const manifest = buildAuthenticityManifest(record);
      const hash = assertionHash(manifest);
      const { error } = await db.rpc("store_authenticity_manifest", {
        p_profile_id: profile.id, p_identity_revision: identity.identity_revision,
        p_presentation_revision: profile.presentation_revision, p_payload: manifest, p_payload_hash: hash,
      });
      if (error) throw error;
      deliveries += await queueAuthenticityNetworkEvent(db, profile.creator_id, profile.public_slug, "authenticity.updated", `manifest_${hash}`, {
        manifest: `/api/public/creators/${profile.public_slug}/manifest`, verification: `/verify/${profile.public_slug}`,
      });
      stored++;
    } catch { failed++; }
  }
  return Response.json({ examined: profiles?.length ?? 0, stored, skipped, failed, deliveries });
}

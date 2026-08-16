import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { boundedNetworkFetch } from "@/lib/authenticity/network-security";
import { buildAuthenticityManifest, domainDiscoveryDocument } from "@/lib/authenticity/manifest";
import { getPublicAuthenticity, recordAuthenticityView } from "@/lib/authenticity/server";

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
  const owner = crypto.randomUUID();
  const { data: domains, error } = await db.rpc("claim_authenticity_domain_discovery", { p_limit: limit, p_lease_owner: owner });
  if (error) return Response.json({ error: "Domain claim failed" }, { status: 500 });
  let verified = 0, failed = 0;
  for (const row of domains ?? []) {
    let slug: string | null = null;
    try {
      const { data: creator, error: creatorError } = await db.from("creators").select("public_slug").eq("id", row.creator_id).single();
      if (creatorError) throw creatorError;
      slug = creator?.public_slug ?? null;
      if (!slug) throw new Error("creator unavailable");
      const result = await getPublicAuthenticity(slug);
      if (result.status !== "available") throw new Error("record unavailable");
      const record = result.data;
      const expected = domainDiscoveryDocument(buildAuthenticityManifest(record));
      const { response, body } = await boundedNetworkFetch(new URL(`https://${row.hostname}/.well-known/audienceown.json`), { headers: { accept: "application/json" } }, {
        timeoutMs: Number(process.env.AUTHENTICITY_DOMAIN_DISCOVERY_TIMEOUT_MS ?? 4000), maxBytes: Number(process.env.AUTHENTICITY_DOMAIN_DISCOVERY_MAX_BYTES ?? 32768),
      });
      const value = JSON.parse(body);
      if (!response.ok || value.issuer !== expected.issuer || value.creator !== expected.creator || value.verificationUrl !== expected.verificationUrl) throw new Error("manifest mismatch");
      await db.from("creator_identity_domains").update({ discovery_status: "verified", discovery_checked_at: new Date().toISOString(), discovery_next_check_at: new Date(Date.now() + 24 * 60 * 60_000).toISOString(), discovery_lease_owner: null, discovery_lease_expires_at: null }).eq("id", row.id);
      void recordAuthenticityView(slug, "domain_discovery");
      verified++;
    } catch {
      await db.from("creator_identity_domains").update({ discovery_status: "failed", discovery_checked_at: new Date().toISOString(), discovery_next_check_at: new Date(Date.now() + 60 * 60_000).toISOString(), discovery_lease_owner: null, discovery_lease_expires_at: null }).eq("id", row.id);
      failed++;
    }
  }
  return Response.json({ examined: domains?.length ?? 0, verified, failed });
}

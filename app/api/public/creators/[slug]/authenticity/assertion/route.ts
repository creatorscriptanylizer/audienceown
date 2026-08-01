import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicAuthenticity, recordAuthenticityView } from "@/lib/authenticity/server";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const record = await getPublicAuthenticity(slug);
  if (!record) return Response.json({ error: "Not found" }, { status: 404, headers: { "cache-control": "no-store" } });
  if (!record.assertion) return Response.json({ error: "Signed authenticity assertion unavailable", code: "signing_unavailable_or_pending" }, { status: 503, headers: { "cache-control": "no-store" } });
  const db = createAdminClient();
  if (!db) return Response.json({ error: "Unavailable" }, { status: 503 });
  const { data } = await db.from("creator_authenticity_assertions")
    .select("payload,key_id,algorithm,signature,expires_at,revoked_at,superseded_at")
    .eq("key_id", record.assertion.keyId).filter("payload->>sub", "eq", slug)
    .is("revoked_at", null).is("superseded_at", null).gt("expires_at", new Date().toISOString())
    .order("issued_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return Response.json({ error: "Signed authenticity assertion unavailable", code: "assertion_not_current" }, { status: 503, headers: { "cache-control": "no-store" } });
  void recordAuthenticityView(slug, "assertion_request");
  return Response.json({ payload: data.payload, protected: { alg: data.algorithm, kid: data.key_id, typ: "audienceown-authenticity+jws" }, signature: data.signature }, { headers: { "cache-control": "public, max-age=30, must-revalidate" } });
}

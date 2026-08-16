import { createPublicAuthenticityDatabase, publicAuthenticityUnavailable } from "@/lib/authenticity/public-api";
import { getPublicAuthenticity, recordAuthenticityView } from "@/lib/authenticity/server";

const ROUTE = "public_authenticity_continuity_feed";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getPublicAuthenticity(slug);
  if (result.status === "unavailable") return publicAuthenticityUnavailable(ROUTE, "public_authenticity");
  if (result.status === "absent") return Response.json({ error: "Not found" }, { status: 404 });

  const database = createPublicAuthenticityDatabase(ROUTE);
  if (database.status === "unavailable") return database.response;
  const db = database.data;
  const creatorResult = await db.from("creators").select("id").eq("public_slug", slug).maybeSingle();
  if (creatorResult.error) return publicAuthenticityUnavailable(ROUTE, "continuity_feed_creator", creatorResult.error);
  if (!creatorResult.data) return Response.json({ error: "Not found" }, { status: 404 });

  const record = result.data;
  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20) || 20));
  const before = url.searchParams.get("before");
  let query = db.from("creator_continuity_statements")
    .select("id,statement_version,statement_type,provider,previous_public_url,current_public_url,reason_code,issued_at,expires_at,revoked_at,superseded_at,key_id")
    .eq("creator_id", creatorResult.data.id).order("issued_at", { ascending: false }).limit(limit);
  if (before) query = query.lt("issued_at", before);
  const statementsResult = await query;
  if (statementsResult.error) return publicAuthenticityUnavailable(ROUTE, "creator_continuity_statements", statementsResult.error);

  const statements = statementsResult.data ?? [];
  void recordAuthenticityView(slug, "continuity");
  return Response.json({
    version: "audienceown-continuity-feed-v1",
    creator: { slug, verificationUrl: record.authenticity.verificationUrl },
    statements: statements.map((statement) => ({
      id: statement.id, version: statement.statement_version, type: statement.statement_type,
      provider: statement.provider, previousUrl: statement.previous_public_url,
      currentUrl: statement.current_public_url, reasonCode: statement.reason_code,
      issuedAt: statement.issued_at, expiresAt: statement.expires_at,
      revoked: Boolean(statement.revoked_at), superseded: Boolean(statement.superseded_at),
      url: `/api/public/creators/${encodeURIComponent(slug)}/continuity/${statement.id}`,
      keyId: statement.key_id,
    })),
    nextBefore: statements.length === limit ? statements.at(-1)?.issued_at : null,
  }, { headers: { "cache-control": "public, max-age=30, must-revalidate" } });
}

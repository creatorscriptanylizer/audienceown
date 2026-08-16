import { createPublicAuthenticityDatabase, publicAuthenticityUnavailable } from "@/lib/authenticity/public-api";
import { getPublicAuthenticity } from "@/lib/authenticity/server";

const ROUTE = "public_authenticity_continuity_detail";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; statementId: string }> },
) {
  const { slug, statementId } = await params;
  const result = await getPublicAuthenticity(slug);
  if (result.status === "unavailable") return publicAuthenticityUnavailable(ROUTE, "public_authenticity");
  if (result.status === "absent") return Response.json({ error: "Not found" }, { status: 404 });

  const database = createPublicAuthenticityDatabase(ROUTE);
  if (database.status === "unavailable") return database.response;
  const db = database.data;
  const statementResult = await db
    .from("creator_continuity_statements")
    .select("payload,key_id,signature,revoked_at,superseded_at,expires_at,creator_id")
    .eq("id", statementId)
    .maybeSingle();
  if (statementResult.error) {
    return publicAuthenticityUnavailable(ROUTE, "creator_continuity_statements", statementResult.error);
  }
  if (!statementResult.data) return Response.json({ error: "Not found" }, { status: 404 });

  const statement = statementResult.data;
  const creatorResult = await db.from("creators").select("public_slug").eq("id", statement.creator_id).maybeSingle();
  if (creatorResult.error) return publicAuthenticityUnavailable(ROUTE, "continuity_statement_owner", creatorResult.error);
  if (creatorResult.data?.public_slug !== slug) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({
    payload: statement.payload,
    protected: { alg: "EdDSA", kid: statement.key_id, typ: "audienceown-continuity+jws" },
    signature: statement.signature,
    status: {
      revoked: Boolean(statement.revoked_at),
      superseded: Boolean(statement.superseded_at),
      expiresAt: statement.expires_at,
    },
  }, { headers: { "cache-control": statement.revoked_at ? "no-store" : "public, max-age=30, must-revalidate" } });
}

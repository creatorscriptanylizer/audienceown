import { createPublicAuthenticityDatabase, publicAuthenticityUnavailable } from "@/lib/authenticity/public-api";
import { parsePublicIdentityGraph, parsePublicTrust } from "@/lib/identity/public";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const database = createPublicAuthenticityDatabase("public_authenticity_identity");
  if (database.status === "unavailable") return database.response;
  const db = database.data;
  const [graphResult, trustResult] = await Promise.all([
    db.rpc("get_public_creator_identity_graph", { p_slug: slug }),
    db.rpc("get_public_creator_trust", { p_slug: slug }),
  ]);
  if (graphResult.error) return publicAuthenticityUnavailable("public_authenticity_identity", "public_identity_graph", graphResult.error);
  if (trustResult.error) return publicAuthenticityUnavailable("public_authenticity_identity", "public_identity_trust", trustResult.error);
  const graph = parsePublicIdentityGraph(graphResult.data);
  const trust = parsePublicTrust(trustResult.data);
  if (!graph) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ...graph, trust: trust ?? undefined }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
}

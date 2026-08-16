import { createHash } from "node:crypto";
import { publicBaseUrl } from "@/lib/authenticity/public";
import { publicAuthenticityUnavailable } from "@/lib/authenticity/public-api";
import { categorizeEcosystemDestinations } from "@/lib/ecosystem/public";
import { getPublicEcosystemResult } from "@/lib/ecosystem/server";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getPublicEcosystemResult(slug);
  if (result.status === "unavailable") return publicAuthenticityUnavailable("public_authenticity_ecosystem", result.query, result.error);
  if (result.status === "absent") return Response.json({ error: "Not found" }, { status: 404, headers: { "cache-control": "no-store" } });
  const graph = result.data;
  const base = publicBaseUrl();
  const body = JSON.stringify({
    ...graph,
    creator: { ...graph.creator, verificationUrl: new URL(graph.creator.verificationUrl, base) },
    destinations: categorizeEcosystemDestinations({ ...graph, destinations: graph.destinations.map((destination) => ({ ...destination, url: new URL(destination.url, base).toString() })) }),
    assertionUrl: new URL(graph.assertionUrl, base),
  });
  const etag = `"${createHash("sha256").update(body).digest("base64url")}"`;
  const headers = { etag, "cache-control": "public, max-age=60, stale-while-revalidate=300" };
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  return new Response(body, { headers: { ...headers, "content-type": "application/json; charset=utf-8" } });
}

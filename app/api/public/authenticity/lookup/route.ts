import { lookupOfficialAccount } from "@/lib/authenticity/lookup";
import { authenticityRateLimit } from "@/lib/authenticity/rate-limit";
import { recordAuthenticityView } from "@/lib/authenticity/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!authenticityRateLimit(`lookup:${request.headers.get("x-forwarded-for") ?? "anonymous"}`)) return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
  try {
    const result = await lookupOfficialAccount({ url: url.searchParams.get("url") ?? undefined, provider: url.searchParams.get("provider") ?? undefined, handle: url.searchParams.get("handle") ?? undefined });
    if (result.creator) { void recordAuthenticityView(result.creator.slug, "lookup"); void recordAuthenticityView(result.creator.slug, result.matched ? "lookup_matched" : "lookup_unmatched"); }
    return Response.json(result, { headers: { "cache-control": result.matched ? "public, max-age=15, must-revalidate" : "no-store" } });
  } catch { return Response.json({ matched: false, error: "Invalid lookup" }, { status: 400, headers: { "cache-control": "no-store" } }); }
}

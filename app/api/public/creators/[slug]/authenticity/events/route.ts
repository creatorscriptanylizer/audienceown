import { createPublicAuthenticityDatabase, publicAuthenticityUnavailable } from "@/lib/authenticity/public-api";
import { getPublicAuthenticity, recordAuthenticityView } from "@/lib/authenticity/server";

const ROUTE = "public_authenticity_events_feed";
const safe: Record<string, string> = {
  key_rotated: "signing_key_rotated", assertion_issued: "assertion_issued",
  assertion_revoked: "assertion_revoked", continuity_issued: "continuity_statement_issued",
  continuity_revoked: "continuity_statement_revoked",
};
const identityMap: Record<string, string> = {
  account_verified: "identity_verified", handle_changed: "account_handle_updated",
  account_primary_changed: "primary_account_changed", domain_verified: "domain_verified",
  emergency_replacement_linked: "account_replaced",
};

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getPublicAuthenticity(slug);
  if (result.status === "unavailable") return publicAuthenticityUnavailable(ROUTE, "public_authenticity");
  if (result.status === "absent") return Response.json({ error: "Not found" }, { status: 404 });

  const database = createPublicAuthenticityDatabase(ROUTE);
  if (database.status === "unavailable") return database.response;
  const db = database.data;
  const creatorResult = await db.from("creators").select("id").eq("public_slug", slug).maybeSingle();
  if (creatorResult.error) return publicAuthenticityUnavailable(ROUTE, "authenticity_events_creator", creatorResult.error);
  if (!creatorResult.data) return Response.json({ error: "Not found" }, { status: 404 });

  const record = result.data;
  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 25) || 25));
  const before = Number(url.searchParams.get("before") ?? Number.MAX_SAFE_INTEGER);
  const [authEventsResult, identityEventsResult] = await Promise.all([
    db.from("creator_authenticity_events").select("id,event_type,created_at")
      .eq("creator_id", creatorResult.data.id).lt("id", before).in("event_type", Object.keys(safe))
      .order("id", { ascending: false }).limit(limit),
    db.from("creator_identity_events").select("id,event_type,created_at")
      .eq("creator_id", creatorResult.data.id).in("event_type", Object.keys(identityMap))
      .order("id", { ascending: false }).limit(limit),
  ]);
  if (authEventsResult.error) return publicAuthenticityUnavailable(ROUTE, "creator_authenticity_events", authEventsResult.error);
  if (identityEventsResult.error) return publicAuthenticityUnavailable(ROUTE, "creator_identity_events", identityEventsResult.error);

  const authEvents = authEventsResult.data ?? [];
  const identityEvents = identityEventsResult.data ?? [];
  const items = [
    ...authEvents.map((event) => ({ id: `auth-${event.id}`, type: safe[event.event_type], at: event.created_at })),
    ...identityEvents.map((event) => ({ id: `identity-${event.id}`, type: identityMap[event.event_type], at: event.created_at })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
  void recordAuthenticityView(slug, "event_feed");
  return Response.json({
    version: "audienceown-authenticity-events-v1",
    creator: { slug, verificationUrl: record.authenticity.verificationUrl }, items,
    nextBefore: authEvents.length ? authEvents.at(-1)?.id : null,
  }, { headers: { "cache-control": "public, max-age=30, must-revalidate" } });
}

import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const creator = await requireCreator();
  const db = await createClient();
  const { data } = await db!.from("creator_authenticity_views").select("*").eq("creator_id", creator.id).order("day", { ascending: true }).limit(366);
  const rows = data ?? [];
  const sum = (key: keyof (typeof rows)[number]) => rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
  const { count: subscribers } = await db!.from("authenticity_network_subscriptions").select("*", { count: "exact", head: true }).eq("creator_id", creator.id).in("status", ["active", "failing"]);
  return Response.json({
    range: { from: rows[0]?.day ?? null, to: rows.at(-1)?.day ?? null },
    totals: {
      verificationPageViews: sum("page_views"), creatorCardViews: sum("card_views"), embedViews: sum("badge_views"), qrResolutions: sum("qr_resolutions"),
      apiRequests: sum("api_requests"), assertionRequests: sum("assertion_requests"), manifestRequests: sum("manifest_requests"), lookupRequests: sum("lookup_requests"),
      lookupMatched: sum("lookup_matched"), lookupUnmatched: sum("lookup_unmatched"), signedLookupRequests: sum("signed_lookup_requests"),
      continuityRequests: sum("continuity_requests"), eventFeedRequests: sum("event_feed_requests"), domainDiscoveryChecks: sum("domain_discovery_checks"),
      sdkRequests: sum("sdk_requests"), webhookDeliveries: sum("webhook_deliveries"), webhookFailures: sum("webhook_failures"), webhookSubscriberCount: subscribers ?? 0,
    },
    daily: rows,
  }, { headers: { "cache-control": "private, no-store" } });
}

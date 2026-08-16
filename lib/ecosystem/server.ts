import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { parsePublicEcosystemGraph } from "./public";

type PublicEcosystemGraph = NonNullable<ReturnType<typeof parsePublicEcosystemGraph>>;
export type PublicEcosystemResult =
  | { status: "available"; data: PublicEcosystemGraph }
  | { status: "absent"; data: null }
  | { status: "unavailable"; data: null; error: unknown; query: string };

export async function getPublicEcosystemResult(slug: string): Promise<PublicEcosystemResult> {
  let db: ReturnType<typeof createAdminClient>;
  try {
    db = createAdminClient();
    if (!db) throw new Error("Public database client unavailable");
  } catch (error) {
    return { status: "unavailable", data: null, error, query: "database_client" };
  }
  const [graphResult, creatorResult] = await Promise.all([
    db.rpc("get_public_creator_ecosystem_graph", { p_slug: slug }),
    db.from("creators").select("id").eq("public_slug", slug).maybeSingle(),
  ]);
  if (graphResult.error) return { status: "unavailable", data: null, error: graphResult.error, query: "public_ecosystem_graph" };
  if (creatorResult.error) return { status: "unavailable", data: null, error: creatorResult.error, query: "public_ecosystem_creator" };

  const graph = parsePublicEcosystemGraph(graphResult.data);
  if (!graph) return { status: "absent", data: null };
  if (!creatorResult.data) return { status: "absent", data: null };

  const manualResult = await db.from("manual_service_connections")
    .select("service_name,service_category,canonical_url,public_handle,last_verified_at,primary_for_category")
    .eq("creator_id", creatorResult.data.id).eq("verification_status", "verified").eq("official", true)
    .eq("public_visible", true).is("revoked_at", null).is("archived_at", null);
  if (manualResult.error) return { status: "unavailable", data: null, error: manualResult.error, query: "public_manual_services" };

  for (const service of manualResult.data ?? []) {
    graph.destinations.push({
      type: ["community", "newsletter", "membership", "commerce", "booking", "website", "application", "podcast"].includes(service.service_category)
        ? service.service_category as "community" | "newsletter" | "membership" | "commerce" | "booking" | "website" | "application" | "podcast"
        : "other",
      provider: "manual_service", name: service.service_name, handle: service.public_handle ?? undefined,
      url: service.canonical_url, official: true, primary: service.primary_for_category,
      verifiedAt: service.last_verified_at ?? undefined,
    });
  }
  return { status: "available", data: graph };
}

/** @deprecated Public routes should use getPublicEcosystemResult to preserve availability. */
export async function getPublicEcosystem(slug: string) {
  const result = await getPublicEcosystemResult(slug);
  return result.status === "available" ? result.data : null;
}

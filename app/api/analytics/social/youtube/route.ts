import { getCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const creator = await getCreator();
  if (!creator) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const client = await createClient();
  const { data, error } = await client!.rpc("get_youtube_automation_analytics");
  if (error) return Response.json({ error: "Analytics unavailable" }, { status: 500 });
  return Response.json(data, { headers: { "cache-control": "private, no-store" } });
}

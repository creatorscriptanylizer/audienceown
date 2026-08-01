import { randomBytes } from "node:crypto";
import { getViewer } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptWebhookSecret } from "@/lib/authenticity/network-security";
import { requireSameOrigin } from "@/lib/emergency/request-security";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!requireSameOrigin(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });
  const user = await getViewer();
  const db = createAdminClient();
  const { id } = await params;
  if (!user || !db) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const secret = randomBytes(32).toString("base64url");
  const { data } = await db.from("authenticity_network_subscriptions")
    .update({ secret_ciphertext: encryptWebhookSecret(secret) })
    .eq("id", id).eq("owner_user_id", user.id).select("id").maybeSingle();
  return data
    ? Response.json({ id, secret, warning: "The secret is shown only once." }, { headers: { "cache-control": "private, no-store" } })
    : Response.json({ error: "Not found" }, { status: 404 });
}

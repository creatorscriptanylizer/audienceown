import { getCreator, getViewer } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { deleteCreatorYouTubeAuthorizedData } from "@/lib/youtube-data-deletion";

export const runtime = "nodejs";
const CONFIRMATION = "DELETE AUDIENCEOWN";
const RECENT_AUTH_WINDOW_MS = 15 * 60_000;

export async function POST(request: Request) {
  const [user, creator] = await Promise.all([getViewer(), getCreator()]);
  if (!user || !creator) return Response.json({ error: "Sign in is required." }, { status: 401 });
  const input = await request.json().catch(() => null) as { confirmation?: string } | null;
  if (input?.confirmation !== CONFIRMATION) return Response.json({ error: `Type ${CONFIRMATION} exactly.` }, { status: 400 });
  const lastSignIn = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : 0;
  if (!lastSignIn || Date.now() - lastSignIn > RECENT_AUTH_WINDOW_MS) {
    return Response.json({ error: "For your security, sign out and sign in again before deleting your account.", code: "recent_auth_required" }, { status: 403 });
  }
  const admin = createAdminClient();
  if (!admin) return Response.json({ error: "Account cleanup is not configured." }, { status: 503 });
  try {
    const connections = await admin.from("connected_accounts").select("id").eq("creator_id", creator.id).eq("platform", "youtube");
    if (connections.error) throw connections.error;
    for (const connection of connections.data) {
      const result = await deleteCreatorYouTubeAuthorizedData(admin, creator.id, connection.id, "remove_account");
      if (result.status === "revocation_pending") return Response.json({ error: "Google revocation is pending. Provider access is disabled; retry account deletion after revocation completes.", code: "provider_cleanup_pending" }, { status: 503 });
    }
    const creatorDelete = await admin.from("creators").delete().eq("id", creator.id).eq("owner_user_id", user.id);
    if (creatorDelete.error) throw creatorDelete.error;
    const authDelete = await admin.auth.admin.deleteUser(user.id);
    if (authDelete.error) throw authDelete.error;
    const client = await createClient();
    await client?.auth.signOut({ scope: "global" });
    return Response.json({ status: "deleted" });
  } catch {
    return Response.json({ error: "Account deletion did not complete. No success was recorded; please retry or contact support." }, { status: 503 });
  }
}

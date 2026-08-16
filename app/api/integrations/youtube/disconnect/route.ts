import { getCreator } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteCreatorYouTubeAuthorizedData, type YouTubeDeletionMode } from "@/lib/youtube-data-deletion";
import { removeCreatorConnectedAccount } from "@/lib/connected-account-removal";
import { revalidateCreatorAccounts } from "@/lib/social-providers/creator-account-revalidation";
import { logProviderOperation } from "@/lib/social-providers/authorized-credential";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const creator = await getCreator();
  if (!creator) return Response.json({ error: "Sign in is required." }, { status: 401 });
  const input = await request.json().catch(() => null) as { connectionId?: string; mode?: YouTubeDeletionMode } | null;
  if (!input?.connectionId || !["keep_manual", "remove_account"].includes(input.mode ?? "")) {
    return Response.json({ error: "Choose a disconnect option." }, { status: 400 });
  }
  const admin = createAdminClient();
  if (!admin) return Response.json({ error: "Account cleanup is not configured." }, { status: 503 });
  try {
    logProviderOperation("disconnect_started", { provider: "youtube", connectionId: input.connectionId });
    const result = input.mode === "remove_account"
      ? await removeCreatorConnectedAccount(admin, creator.id, input.connectionId)
      : await deleteCreatorYouTubeAuthorizedData(admin, creator.id, input.connectionId, "keep_manual");
    logProviderOperation(result.status === "revocation_pending" ? "cleanup_pending" : "disconnect_completed", { provider: "youtube", connectionId: input.connectionId });
    revalidateCreatorAccounts(creator.id);
    return Response.json(result, { status: result.status === "revocation_pending" ? 202 : 200 });
  } catch {
    return Response.json({ error: "YouTube cleanup could not be completed. The connection remains disabled; please retry." }, { status: 503 });
  }
}

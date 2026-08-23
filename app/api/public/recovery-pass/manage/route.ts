import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clearRecoverySession, readRecoverySession, sha256 } from "@/lib/recovery-pass-session";
import { debugError, debugLog } from "@/lib/debug";

const schema = z.discriminatedUnion("action", [
  z.object({ slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), action: z.literal("leave") }).strict(),
  z.object({ slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), action: z.literal("remove_delivery"), methodReference: z.string().length(64).regex(/^[a-f0-9]+$/) }).strict(),
]);

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const token = await readRecoverySession(input.slug);
    const admin = createAdminClient();
    if (!token || !admin) return Response.json({ kind: "validation_error", message: "Your management session has expired." }, { status: 401 });
    const { data, error } = input.action === "leave"
      ? await admin.rpc("leave_public_recovery_pass" as never, { p_slug: input.slug, p_preference_token_hash: await sha256(token) } as never) as unknown as { data: boolean; error: unknown }
      : await admin.rpc("remove_recovery_pass_delivery" as never, { p_slug: input.slug, p_preference_token_hash: await sha256(token), p_method_reference: input.methodReference } as never) as unknown as { data: boolean; error: unknown };
    if (error || !data) return Response.json({ kind: "validation_error", message: "Recovery Pass could not be left." }, { status: 400 });
    if (input.action === "leave") { await clearRecoverySession(input.slug); debugLog("general", { event: "recovery_pass_membership_left", creatorSlug: input.slug }); return Response.json({ kind: "membership_left" }); }
    debugLog("general", { event: "recovery_pass_delivery_removed", creatorSlug: input.slug });
    return Response.json({ kind: "delivery_removed" });
  } catch (error) {
    debugError("general", error, { event: "recovery_pass_management_failed" });
    return Response.json({ kind: "validation_error", message: "That request could not be completed." }, { status: 400 });
  }
}

import { z } from "zod";
import { requireSameOrigin } from "@/lib/emergency/request-security";
import { recoveryPassDestinations, recoveryPassDestinationsForMain, setRecoveryPassDestination, setRecoveryPassDestinationForMain } from "@/lib/recovery-pass-destinations";

const schema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  preferenceToken: z.string().min(20).max(200),
  mainAccountId: z.string().uuid().optional(),
  destinationId: z.string().regex(/^(connected_account|identity_account|ecosystem_destination):[0-9a-f-]{36}$/).optional(),
  selected: z.boolean().optional(),
}).strict().refine((value) => (value.destinationId === undefined) === (value.selected === undefined));

export async function POST(request: Request) {
  if (!requireSameOrigin(request)) return Response.json({ error: "invalid_origin" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });
  try {
    if (parsed.data.destinationId !== undefined && parsed.data.selected !== undefined) {
      if(parsed.data.mainAccountId)await setRecoveryPassDestinationForMain(parsed.data.slug,parsed.data.preferenceToken,parsed.data.mainAccountId,parsed.data.destinationId,parsed.data.selected);
      else await setRecoveryPassDestination(parsed.data.slug, parsed.data.preferenceToken, parsed.data.destinationId, parsed.data.selected);
    }
    const { candidates } = parsed.data.mainAccountId?await recoveryPassDestinationsForMain(parsed.data.slug,parsed.data.preferenceToken,parsed.data.mainAccountId):await recoveryPassDestinations(parsed.data.slug, parsed.data.preferenceToken);
    return Response.json({ destinations: candidates.map((item) => ({ id: item.id, type: item.type,
      provider: item.provider, displayName: item.displayName, handle: item.handle,
      profileUrl: item.profileUrl, selected: item.selected, available: item.available })) }, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "destination_request_failed";
    const status = code === "invalid_participation" ? 403 : code === "invalid_destination" ? 404 : 409;
    return Response.json({ error: code === "invalid_participation" ? code : "destination_request_failed" }, { status });
  }
}

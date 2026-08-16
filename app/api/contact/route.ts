import { createHash } from "node:crypto";
import { authenticityRateLimit } from "@/lib/authenticity/rate-limit";
import { configuredContactEmail } from "@/lib/contact-email";
import { processContactSubmission } from "@/lib/contact-form";
import { requireContactOrigin } from "@/lib/contact-request-security";
import { MAX_CONTACT_REQUEST_BYTES } from "@/lib/contact-form-contract";
import { validateContactAttachments } from "@/lib/contact-attachments";

export const runtime = "nodejs";

function rateLimitKey(request: Request) {
  const source = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return `contact:${createHash("sha256").update(source).digest("hex")}`;
}

export async function POST(request: Request) {
  const headers = { "cache-control": "no-store" };
  if (!requireContactOrigin(request)) return Response.json({ status: "error" }, { status: 403, headers });
  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_CONTACT_REQUEST_BYTES) return Response.json({ status: "invalid", errors: { attachments: "This submission is too large." } }, { status: 413, headers });
  let input: Record<string, FormDataEntryValue>; let files: File[];
  try { const formData = await request.formData(); files = formData.getAll("attachments").filter((entry): entry is File => entry instanceof File); input = Object.fromEntries([...formData.entries()].filter(([key]) => key !== "attachments")); }
  catch { return Response.json({ status: "invalid", errors: { message: "Submit a valid form." } }, { status: 400, headers }); }
  const validated = await validateContactAttachments(files);
  if ("error" in validated) return Response.json({ status: "invalid", errors: { attachments: validated.error } }, { status: 400, headers });
  const result = await processContactSubmission(input, { ...configuredContactEmail(), attachments: validated.attachments, allowed: authenticityRateLimit(rateLimitKey(request), 5, 15 * 60_000) });
  if (result.status === "success") return Response.json(result, { headers });
  if (result.status === "invalid") return Response.json(result, { status: 400, headers });
  if (result.status === "rate_limited") return Response.json(result, { status: 429, headers });
  return Response.json(result, { status: 503, headers });
}

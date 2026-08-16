import { timingSafeEqual } from "node:crypto";
import { validateContactAttachments } from "@/lib/contact-attachments";
import { MAX_CONTACT_REQUEST_BYTES } from "@/lib/contact-form-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "cache-control": "no-store" };

function proofEnabled() {
  return process.env.RENDER_MULTIPART_PROOF_ENABLED === "true";
}

function authorized(request: Request) {
  const configured = process.env.RENDER_MULTIPART_PROOF_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configured || !provided) return false;
  const configuredBytes = Buffer.from(configured);
  const providedBytes = Buffer.from(provided);
  return configuredBytes.length === providedBytes.length && timingSafeEqual(configuredBytes, providedBytes);
}

export async function POST(request: Request) {
  if (!proofEnabled()) return new Response(null, { status: 404, headers });
  if (!authorized(request)) return Response.json({ status: "unauthorized" }, { status: 401, headers });

  const declaredBytes = Number(request.headers.get("content-length") ?? 0);
  if (declaredBytes > MAX_CONTACT_REQUEST_BYTES) {
    return Response.json(
      { status: "rejected", receivedBytes: declaredBytes, fileCount: 0, validation: "request_too_large" },
      { status: 413, headers: { ...headers, "x-audienceown-proof-reached": "application" } },
    );
  }

  let files: File[];
  try {
    const formData = await request.formData();
    files = formData.getAll("attachments").filter((entry): entry is File => entry instanceof File);
  } catch {
    return Response.json(
      { status: "rejected", receivedBytes: declaredBytes, fileCount: 0, validation: "invalid_multipart" },
      { status: 400, headers: { ...headers, "x-audienceown-proof-reached": "application" } },
    );
  }

  const validated = await validateContactAttachments(files);
  const attachmentBytes = files.reduce((total, file) => total + file.size, 0);
  const receivedBytes = declaredBytes || attachmentBytes;
  if ("error" in validated) {
    return Response.json(
      { status: "rejected", receivedBytes, fileCount: files.length, validation: "attachment_invalid" },
      { status: 400, headers: { ...headers, "x-audienceown-proof-reached": "application" } },
    );
  }

  return Response.json(
    { status: "accepted", receivedBytes, fileCount: validated.attachments.length, validation: "success" },
    { headers: { ...headers, "x-audienceown-proof-reached": "application" } },
  );
}

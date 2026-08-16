import { ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENT_COUNT, MAX_TOTAL_ATTACHMENT_BYTES } from "@/lib/contact-form-contract";
export type ValidatedContactAttachment = { filename: string; content: Buffer; contentType: typeof ALLOWED_ATTACHMENT_TYPES[number] };
export type AttachmentValidation = { attachments: ValidatedContactAttachment[] } | { error: string };
const extensions: Record<string, readonly string[]> = { "image/png": ["png"], "image/jpeg": ["jpg", "jpeg"], "image/webp": ["webp"] };
function detectedType(bytes: Uint8Array) {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}
export async function validateContactAttachments(files: File[]): Promise<AttachmentValidation> {
  if (files.length > MAX_ATTACHMENT_COUNT) return { error: `Attach no more than ${MAX_ATTACHMENT_COUNT} images.` };
  let total = 0; const attachments: ValidatedContactAttachment[] = [];
  for (const file of files) {
    if (!file.size) return { error: "Empty images cannot be attached." };
    if (file.size > MAX_ATTACHMENT_BYTES) return { error: "This image is too large. Maximum size is 5 MB." };
    total += file.size; if (total > MAX_TOTAL_ATTACHMENT_BYTES) return { error: "Attachments must be 10 MB or less in total." };
    const content = Buffer.from(await file.arrayBuffer()); const type = detectedType(content); const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!type || file.type !== type || !extensions[type]?.includes(extension)) return { error: "Attach only valid PNG, JPEG, or WEBP images." };
    attachments.push({ filename: file.name.replace(/[\\/\r\n\0]/g, "_").slice(0, 180), content, contentType: type });
  }
  return { attachments };
}

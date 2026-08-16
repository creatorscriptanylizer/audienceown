import { describe, expect, it } from "vitest";
import { validateContactAttachments } from "@/lib/contact-attachments";
const bytes = {
  png: new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),
  jpeg: new Uint8Array([0xff,0xd8,0xff,0xdb]),
  webp: new TextEncoder().encode("RIFF0000WEBP"),
};
const image = (name: string, type: string, content: Uint8Array) => new File([content as BlobPart], name, { type });
describe("contact attachments", () => {
  it.each([["shot.png","image/png",bytes.png],["shot.jpg","image/jpeg",bytes.jpeg],["shot.webp","image/webp",bytes.webp]] as const)("accepts %s", async (name, type, content) => expect(await validateContactAttachments([image(name,type,content)])).toMatchObject({ attachments: [{ filename: name, contentType: type }] }));
  it("rejects too many files", async () => expect(await validateContactAttachments(Array.from({length:4},(_,i)=>image(`${i}.png`,"image/png",bytes.png)))).toHaveProperty("error"));
  it("rejects oversized and zero-byte images", async () => { expect(await validateContactAttachments([image("large.png","image/png",new Uint8Array(5*1024*1024+1))])).toHaveProperty("error"); expect(await validateContactAttachments([image("empty.png","image/png",new Uint8Array())])).toHaveProperty("error"); });
  it.each([["vector.svg","image/svg+xml",new TextEncoder().encode("<svg/>")],["fake.png","image/png",new TextEncoder().encode("<html></html>")],["unknown.bin","application/octet-stream",new Uint8Array([1,2,3])]] as const)("rejects %s", async (name,type,content)=>expect(await validateContactAttachments([image(name,type,content)])).toHaveProperty("error"));
});

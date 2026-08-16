import { z } from "zod";
import { CONTACT_AREAS, CONTACT_SUBTOPICS, CONTACT_TOPICS, CONTACT_URGENCIES, contactTopicDestinations, contactTopicLabels, type ContactFormErrors, type ContactFormFields } from "@/lib/contact-form-contract";
import type { ValidatedContactAttachment } from "@/lib/contact-attachments";
export { contactTopicDestinations, contactTopicLabels } from "@/lib/contact-form-contract";
export type { ContactTopic } from "@/lib/contact-form-contract";
const headerSafe = (label: string) => z.string().refine(value => !/[\r\n]/.test(value), `${label} cannot contain line breaks.`);
const optionalHeader = (label: string, max: number) => headerSafe(label).trim().max(max).optional().default("");
const schema = z.object({
  topic: z.enum(CONTACT_TOPICS, { error: "Choose a topic." }), subtopic: optionalHeader("Context", 80), area: optionalHeader("Product area", 80), urgency: optionalHeader("Urgency", 80), pageUrl: z.string().trim().max(500).optional().default(""),
  name: headerSafe("Name").trim().min(1, "Enter your name.").max(100), email: headerSafe("Email").trim().email("Enter a valid email address.").max(254).transform(value => value.toLowerCase()), handle: optionalHeader("Handle", 80),
  subject: headerSafe("Subject").trim().min(1, "Enter a subject.").max(160), message: z.string().trim().min(1, "Enter a message.").max(5000), website: z.string().max(0).optional().default(""),
}).strict().superRefine((value, ctx) => {
  const options = CONTACT_SUBTOPICS[value.topic as keyof typeof CONTACT_SUBTOPICS] as readonly string[] | undefined;
  if (value.subtopic && (!options || !options.includes(value.subtopic))) ctx.addIssue({ code: "custom", path: ["subtopic"], message: "Choose a valid option." });
  if (value.area && !(CONTACT_AREAS as readonly string[]).includes(value.area)) ctx.addIssue({ code: "custom", path: ["area"], message: "Choose a valid product area." });
  if (value.urgency && !(CONTACT_URGENCIES as readonly string[]).includes(value.urgency)) ctx.addIssue({ code: "custom", path: ["urgency"], message: "Choose a valid urgency." });
  if (value.pageUrl) { try { const url = new URL(value.pageUrl); if (url.protocol !== "https:" || !["audienceown.com", "www.audienceown.com", "dev.audienceown.com"].includes(url.hostname)) throw new Error(); } catch { ctx.addIssue({ code: "custom", path: ["pageUrl"], message: "Enter an AudienceOwn URL." }); } }
});
export type ContactEmail = { from: string; to: string; replyTo: string; subject: string; text: string; attachments?: ValidatedContactAttachment[] };
export type ContactEmailSender = (email: ContactEmail) => Promise<{ id: string } | { error: unknown }>;
export type ContactSubmissionResult = { status: "success" } | { status: "invalid"; errors: ContactFormErrors } | { status: "rate_limited" } | { status: "unavailable" };
function fieldErrors(error: z.ZodError): ContactFormErrors { const result: ContactFormErrors = {}; for (const issue of error.issues) { const field = issue.path[0]; if (typeof field === "string" && field !== "website" && !result[field as ContactFormFields]) result[field as ContactFormFields] = issue.message; } return result; }
export async function processContactSubmission(input: unknown, dependencies: { sender: ContactEmailSender | null; from: string | null; allowed: boolean; now?: Date; attachments?: ValidatedContactAttachment[] }): Promise<ContactSubmissionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) { const honeypot = typeof input === "object" && input !== null && "website" in input && Boolean(input.website); return honeypot ? { status: "success" } : { status: "invalid", errors: fieldErrors(parsed.error) }; }
  if (!dependencies.allowed) return { status: "rate_limited" }; if (!dependencies.sender || !dependencies.from) return { status: "unavailable" };
  const value = parsed.data, label = contactTopicLabels[value.topic];
  const details = [["Topic", label], ["Subtopic", value.subtopic], ["Product area", value.area], ["Urgency", value.urgency], ["Name", value.name], ["Reply email", value.email], ["AudienceOwn handle", value.handle], ["Subject", value.subject]].filter(([, v]) => v).map(([key, v]) => `${key}: ${v}`);
  const attachmentLines = dependencies.attachments?.length ? ["", "Attachments:", ...dependencies.attachments.map(item => `- ${item.filename}`)] : [];
  const text = ["AudienceOwn Contact Request", "", ...details, "", "Message:", value.message, ...(value.pageUrl ? ["", `Page URL: ${value.pageUrl}`] : []), ...attachmentLines, "", `Submitted at: ${(dependencies.now ?? new Date()).toISOString()}`].join("\n");
  const prefix = value.topic === "privacy_request" ? "AudienceOwn Privacy" : value.topic === "security_abuse" ? "AudienceOwn Security" : "AudienceOwn Support";
  try { const result = await dependencies.sender({ from: dependencies.from, to: contactTopicDestinations[value.topic], replyTo: value.email, subject: `[${prefix}] ${value.subtopic || label} — ${value.subject}`, text, ...(dependencies.attachments?.length ? { attachments: dependencies.attachments } : {}) }); return "id" in result ? { status: "success" } : { status: "unavailable" }; } catch { return { status: "unavailable" }; }
}

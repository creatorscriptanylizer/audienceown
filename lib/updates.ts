import { z } from "zod";

export const broadcastTypes = [
  "new_content",
  "announcement",
  "livestream",
  "event",
  "product_launch",
  "account_update",
] as const;

export type BroadcastType = (typeof broadcastTypes)[number];

export const broadcastTypeLabels: Record<BroadcastType, string> = {
  new_content: "New content",
  announcement: "Announcement",
  livestream: "Livestream",
  event: "Event",
  product_launch: "Product launch",
  account_update: "Important account update",
};

export const broadcastTypeDescriptions: Record<BroadcastType, string> = {
  new_content: "Share a new video, episode, post, or release.",
  announcement: "Tell your audience about an important development.",
  livestream: "Invite your audience to an upcoming live broadcast.",
  event: "Share an in-person or online event.",
  product_launch: "Introduce a product, collection, or offer.",
  account_update: "Share an essential account or access change.",
};

export const broadcastPreferenceMap: Record<BroadcastType, "videos" | "announcements" | "livestreams" | "products" | "recovery"> = {
  new_content: "videos",
  announcement: "announcements",
  livestream: "livestreams",
  event: "announcements",
  product_launch: "products",
  account_update: "recovery",
};

export const broadcastStatuses = [
  "draft",
  "scheduled",
  "queued",
  "sending",
  "sent",
  "cancelled",
  "failed",
] as const;

export type BroadcastStatus = (typeof broadcastStatuses)[number];

export const broadcastStatusLabels: Record<BroadcastStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  queued: "Queued",
  sending: "Sending",
  sent: "Sent",
  cancelled: "Cancelled",
  failed: "Failed",
};

const optionalHttpsUrl = z.string().trim().refine(
  (value) => value === "" || value.startsWith("https://"),
  "CTA URL must begin with https://",
);

export const updateDraftSchema = z.object({
  broadcast_type: z.enum(broadcastTypes, "Choose an update type."),
  title: z.string().trim().max(120, "Internal title must be 120 characters or fewer."),
  subject: z.string().trim().max(160, "Subject must be 160 characters or fewer."),
  preview_text: z.string().trim().max(200, "Preview text must be 200 characters or fewer."),
  content: z.string().trim().max(20_000, "Message must be 20,000 characters or fewer."),
  cta_label: z.string().trim().max(60, "CTA label must be 60 characters or fewer."),
  cta_url: optionalHttpsUrl,
});

export const updatePublishSchema = updateDraftSchema.extend({
  title: z.string().trim().min(1, "Add an internal title.").max(120, "Internal title must be 120 characters or fewer."),
  subject: z.string().trim().min(1, "Add an email subject.").max(160, "Subject must be 160 characters or fewer."),
  content: z.string().trim().min(1, "Add a message.").max(20_000, "Message must be 20,000 characters or fewer."),
});

export type UpdateDraftInput = z.infer<typeof updateDraftSchema>;
export type UpdatePublishInput = z.infer<typeof updatePublishSchema>;

export function formatBroadcastType(type: BroadcastType) {
  return broadcastTypeLabels[type];
}

export function formatBroadcastStatus(status: BroadcastStatus) {
  return broadcastStatusLabels[status];
}

export function parseBroadcastTypeQuery(value: string | string[] | undefined): BroadcastType {
  const candidate = Array.isArray(value) ? value[0] : value;
  return broadcastTypes.includes(candidate as BroadcastType) ? candidate as BroadcastType : "new_content";
}

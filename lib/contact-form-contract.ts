export const CONTACT_TOPICS = [
  "account_sign_in", "creator_profile", "recovery_pass", "recovery_destinations", "audience_preferences", "platforms_connected_accounts", "updates_notifications", "identity_authenticity", "ecosystem", "emergency_mode", "recovery_analytics", "billing_plan", "privacy_request", "security_abuse", "partnership_business", "other",
] as const;
export type ContactTopic = typeof CONTACT_TOPICS[number];
export function isContactTopic(value: unknown): value is ContactTopic {
  return typeof value === "string" && (CONTACT_TOPICS as readonly string[]).includes(value);
}
export const CONTACT_EMAIL = "contact@audienceown.com";
export const SUPPORT_EMAIL = "support@audienceown.com";
export const CONTACT_EMAIL_FROM = "AudienceOwn <contact@mail.audienceown.com>";
export const contactTopicLabels: Record<ContactTopic, string> = {
  account_sign_in: "Account & sign-in", creator_profile: "Creator profile / public page", recovery_pass: "Recovery Pass", recovery_destinations: "Recovery destinations", audience_preferences: "Audience & preferences", platforms_connected_accounts: "Platforms & connected accounts", updates_notifications: "Updates & notifications", identity_authenticity: "Identity & authenticity", ecosystem: "Ecosystem", emergency_mode: "Emergency Mode", recovery_analytics: "Recovery Analytics", billing_plan: "Billing & plan", privacy_request: "Privacy request", security_abuse: "Security or abuse report", partnership_business: "Partnership / business inquiry", other: "Other",
};
export const CONTACT_TOPIC_GROUPS = [
  { label: "Account", topics: ["account_sign_in", "billing_plan"] },
  { label: "Audience & recovery", topics: ["recovery_pass", "recovery_destinations", "audience_preferences", "recovery_analytics"] },
  { label: "Creator tools", topics: ["creator_profile", "updates_notifications", "platforms_connected_accounts"] },
  { label: "Trust & safety", topics: ["identity_authenticity", "ecosystem", "emergency_mode", "privacy_request", "security_abuse"] },
  { label: "General", topics: ["partnership_business", "other"] },
] as const satisfies ReadonlyArray<{ label: string; topics: readonly ContactTopic[] }>;
const supportTopics = new Set<ContactTopic>(CONTACT_TOPICS.slice(0, 12));
export const contactTopicDestinations = Object.fromEntries(CONTACT_TOPICS.map(topic => [topic, supportTopics.has(topic) ? SUPPORT_EMAIL : CONTACT_EMAIL])) as Record<ContactTopic, typeof SUPPORT_EMAIL | typeof CONTACT_EMAIL>;
export const CONTACT_SUBTOPICS = {
  account_sign_in: ["Can’t sign in", "Email/account issue", "Account recovery", "Two-factor authentication", "Account deletion", "Other"],
  platforms_connected_accounts: ["YouTube", "Instagram", "TikTok", "X", "Twitch", "Facebook", "LinkedIn", "Snapchat", "Pinterest", "Discord", "Spotify", "Other"],
  updates_notifications: ["Creating an update", "Scheduling", "Delivery", "Audience targeting", "Draft", "History", "Other"],
  recovery_pass: ["Sharing Recovery Pass", "Destination selection", "Participant opt-in", "Recovery destination", "Other"],
  emergency_mode: ["Preparedness", "Activation", "Replacement account", "Authorization", "Delivery", "Other"],
  billing_plan: ["Subscription", "Checkout", "Billing portal", "Plan limits", "Other"],
  privacy_request: ["Access my data", "Correct my data", "Delete my data", "Export my data", "Privacy question", "Other"],
  security_abuse: ["Account impersonation", "Abuse", "Suspicious activity", "Security vulnerability", "Other"],
} as const satisfies Partial<Record<ContactTopic, readonly string[]>>;
export const CONTACT_AREAS = ["Dashboard", "Creator Page", "Updates", "Audience", "Platforms", "Identity", "Ecosystem", "Authenticity", "Recovery Analytics", "Emergency", "Settings", "Public creator page", "Recovery Pass", "Other"] as const;
export const CONTACT_URGENCIES = ["Normal", "Blocking my use of AudienceOwn", "Security or safety concern"] as const;
export const URGENT_TOPICS: readonly ContactTopic[] = ["account_sign_in", "emergency_mode", "security_abuse"];
export const MAX_ATTACHMENT_COUNT = 3;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_TOTAL_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_CONTACT_REQUEST_BYTES = MAX_TOTAL_ATTACHMENT_BYTES + 512 * 1024;
export const ALLOWED_ATTACHMENT_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type ContactFormFields = "topic" | "subtopic" | "area" | "urgency" | "pageUrl" | "name" | "email" | "handle" | "subject" | "message" | "attachments";
export type ContactFormErrors = Partial<Record<ContactFormFields, string>>;

import type { BroadcastType } from "@/lib/updates";

export const broadcastIntents = [
  "account_hacked", "account_banned", "account_inaccessible", "impersonation_warning",
  "platform_migration", "new_video", "livestream", "podcast_episode",
  "product_release", "event", "general_announcement", "community_update",
] as const;

export type BroadcastIntent = (typeof broadcastIntents)[number];
export type AudienceRule = "affected_platform" | "platform_followers" | "category_followers";

export type IntentDefinition = {
  intent: BroadcastIntent;
  group: "protect" | "share";
  title: string;
  description: string;
  broadcastType: BroadcastType;
  platform: "required" | "optional" | "none";
  category: "recovery" | "videos" | "livestreams" | "products" | "announcements";
  mandatory: boolean;
  action: string;
  placeholder: string;
};

export type AlertComposerDefinition = {
  intent: BroadcastIntent;
  contextHeading: string | null;
  contextCopy: string | null;
  audienceLabel: string;
  titleFieldLabel: string;
  showSubject: boolean;
  showPreviewText: boolean;
  destinationMode: "required" | "optional" | "recovery";
  destinationHeading: string;
  destinationLabel: string;
  verificationLabel: string | null;
  verificationNoun: string | null;
  ctaPlaceholder: string;
  sendLabel: string;
  scheduleLabel: string;
  reviewTitle: string;
  zeroAudienceHeading: string;
  accent: "violet" | "magenta" | "rose" | "cyan" | "emerald" | "purple" | "indigo" | "amber" | "blue";
};

function freezeDefinitionMap<T extends Record<string, object>>(definitions: T): { readonly [K in keyof T]: Readonly<T[K]> } {
  for (const definition of Object.values(definitions)) Object.freeze(definition);
  return Object.freeze(definitions);
}

export const alertComposerDefinitions = freezeDefinitionMap({
  new_video:{intent:"new_video",contextHeading:"Where did you publish this?",contextCopy:"Select the connected accounts where this video is available. This alert will only be sent to followers who opted in to receive your video updates.",audienceLabel:"Videos",titleFieldLabel:"Title",showSubject:false,showPreviewText:false,destinationMode:"required",destinationHeading:"Where should followers go?",destinationLabel:"Video URL",verificationLabel:"Verify video",verificationNoun:"video",ctaPlaceholder:"Watch video",sendLabel:"Send video alert",scheduleLabel:"Schedule video alert",reviewTitle:"Review your video alert",zeroAudienceHeading:"No followers are currently opted in to receive video updates.",accent:"violet"},
  livestream:{intent:"livestream",contextHeading:"Where are you going live?",contextCopy:"Select where your livestream will be available. This alert will only be sent to followers who opted in to receive livestream updates.",audienceLabel:"Livestreams",titleFieldLabel:"Livestream title",showSubject:true,showPreviewText:true,destinationMode:"required",destinationHeading:"Where should followers watch?",destinationLabel:"Livestream URL",verificationLabel:"Verify livestream",verificationNoun:"livestream",ctaPlaceholder:"Watch live",sendLabel:"Send livestream alert",scheduleLabel:"Schedule livestream alert",reviewTitle:"Review your livestream alert",zeroAudienceHeading:"No followers are currently opted in to receive livestream updates.",accent:"magenta"},
  podcast_episode:{intent:"podcast_episode",contextHeading:"Where is this episode available?",contextCopy:"Select the connected accounts where this episode is available. This alert will only be sent to followers who opted in to receive podcast updates.",audienceLabel:"Videos",titleFieldLabel:"Podcast episode title",showSubject:true,showPreviewText:true,destinationMode:"required",destinationHeading:"Where should followers listen?",destinationLabel:"Episode URL",verificationLabel:"Verify episode",verificationNoun:"episode",ctaPlaceholder:"Listen now",sendLabel:"Send podcast alert",scheduleLabel:"Schedule podcast alert",reviewTitle:"Review your podcast alert",zeroAudienceHeading:"No followers are currently opted in to receive podcast updates.",accent:"rose"},
  product_release:{intent:"product_release",contextHeading:"Where is this release available?",contextCopy:"Select the connected accounts where this release is relevant. This alert will only be sent to followers who opted in to receive product updates.",audienceLabel:"Products",titleFieldLabel:"Product release title",showSubject:true,showPreviewText:true,destinationMode:"required",destinationHeading:"Where should followers view it?",destinationLabel:"Release URL",verificationLabel:"Verify release",verificationNoun:"release",ctaPlaceholder:"View release",sendLabel:"Send product update",scheduleLabel:"Schedule product update",reviewTitle:"Review your product update",zeroAudienceHeading:"No followers are currently opted in to receive product updates.",accent:"cyan"},
  event:{intent:"event",contextHeading:"Where is this event happening or listed?",contextCopy:"Select the connected accounts where this event is relevant. This alert will only be sent to followers who opted in to receive announcements.",audienceLabel:"Announcements",titleFieldLabel:"Event title",showSubject:true,showPreviewText:true,destinationMode:"required",destinationHeading:"Where can followers find the event?",destinationLabel:"Event URL",verificationLabel:"Verify event destination",verificationNoun:"event destination",ctaPlaceholder:"View event",sendLabel:"Send event update",scheduleLabel:"Schedule event update",reviewTitle:"Review your event update",zeroAudienceHeading:"No followers are currently opted in to receive announcement updates.",accent:"emerald"},
  general_announcement:{intent:"general_announcement",contextHeading:"Which accounts does this announcement relate to?",contextCopy:"Select the connected accounts this announcement is about. This update will only be sent to Recovery Pass followers who opted in to receive announcements.",audienceLabel:"Announcements",titleFieldLabel:"Title",showSubject:true,showPreviewText:true,destinationMode:"optional",destinationHeading:"Add an optional next step",destinationLabel:"Optional HTTPS destination",verificationLabel:null,verificationNoun:null,ctaPlaceholder:"Read more",sendLabel:"Send announcement",scheduleLabel:"Schedule announcement",reviewTitle:"Review your announcement",zeroAudienceHeading:"No followers are currently opted in to receive announcement updates.",accent:"purple"},
  community_update:{intent:"community_update",contextHeading:"Where is this update relevant?",contextCopy:"Select the connected accounts this community update relates to. This message will only be sent to Recovery Pass followers who opted in to receive community or announcement updates.",audienceLabel:"Announcements",titleFieldLabel:"Title",showSubject:true,showPreviewText:true,destinationMode:"optional",destinationHeading:"Add an optional next step",destinationLabel:"Optional HTTPS destination",verificationLabel:null,verificationNoun:null,ctaPlaceholder:"Read more",sendLabel:"Send community update",scheduleLabel:"Schedule community update",reviewTitle:"Review your community update",zeroAudienceHeading:"No followers are currently opted in to receive announcement updates.",accent:"indigo"},
  account_hacked:{intent:"account_hacked",contextHeading:"Which Main account is affected?",contextCopy:"Choose the compromised Main account. Recipient eligibility still comes from Recovery Pass.",audienceLabel:"Mandatory Recovery Pass",titleFieldLabel:"Alert title",showSubject:true,showPreviewText:true,destinationMode:"recovery",destinationHeading:"Where should followers find you?",destinationLabel:"Verified Recovery destination",verificationLabel:"Verify Recovery destination",verificationNoun:"Recovery destination",ctaPlaceholder:"Find me here",sendLabel:"Send emergency alert",scheduleLabel:"Schedule emergency alert",reviewTitle:"Review emergency alert",zeroAudienceHeading:"No Recovery Pass followers can currently receive this alert.",accent:"amber"},
  account_banned:{intent:"account_banned",contextHeading:"Which Main account is affected?",contextCopy:"Choose the restricted Main account. Recipient eligibility still comes from Recovery Pass.",audienceLabel:"Mandatory Recovery Pass",titleFieldLabel:"Alert title",showSubject:true,showPreviewText:true,destinationMode:"recovery",destinationHeading:"Where should followers find you?",destinationLabel:"Verified Recovery destination",verificationLabel:"Verify Recovery destination",verificationNoun:"Recovery destination",ctaPlaceholder:"Find me here",sendLabel:"Send emergency alert",scheduleLabel:"Schedule emergency alert",reviewTitle:"Review emergency alert",zeroAudienceHeading:"No Recovery Pass followers can currently receive this alert.",accent:"amber"},
  account_inaccessible:{intent:"account_inaccessible",contextHeading:"Which Main account is affected?",contextCopy:"Choose the Main account you cannot access. Recipient eligibility still comes from Recovery Pass.",audienceLabel:"Mandatory Recovery Pass",titleFieldLabel:"Alert title",showSubject:true,showPreviewText:true,destinationMode:"recovery",destinationHeading:"Where should followers find you?",destinationLabel:"Verified Recovery destination",verificationLabel:"Verify Recovery destination",verificationNoun:"Recovery destination",ctaPlaceholder:"Find me here",sendLabel:"Send emergency alert",scheduleLabel:"Schedule emergency alert",reviewTitle:"Review emergency alert",zeroAudienceHeading:"No Recovery Pass followers can currently receive this alert.",accent:"amber"},
  impersonation_warning:{intent:"impersonation_warning",contextHeading:"Which Main account is affected?",contextCopy:"Choose the Main account followers should use to identify this warning. Recipient eligibility still comes from Recovery Pass.",audienceLabel:"Mandatory Recovery Pass",titleFieldLabel:"Alert title",showSubject:true,showPreviewText:true,destinationMode:"recovery",destinationHeading:"Where should followers verify you?",destinationLabel:"Verified Recovery destination",verificationLabel:"Verify Recovery destination",verificationNoun:"Recovery destination",ctaPlaceholder:"Find me here",sendLabel:"Send emergency alert",scheduleLabel:"Schedule emergency alert",reviewTitle:"Review emergency alert",zeroAudienceHeading:"No Recovery Pass followers can currently receive this alert.",accent:"amber"},
  platform_migration:{intent:"platform_migration",contextHeading:"Which Main account are you moving from?",contextCopy:"Choose the Main account your audience is moving away from.",audienceLabel:"Mandatory Recovery Pass",titleFieldLabel:"Migration title",showSubject:true,showPreviewText:true,destinationMode:"recovery",destinationHeading:"Where are followers moving to?",destinationLabel:"Verified Recovery destination",verificationLabel:"Verify Recovery destination",verificationNoun:"Recovery destination",ctaPlaceholder:"Find me here",sendLabel:"Send migration alert",scheduleLabel:"Schedule migration alert",reviewTitle:"Review migration alert",zeroAudienceHeading:"No Recovery Pass followers are currently eligible for this recovery alert.",accent:"blue"},
} satisfies Record<BroadcastIntent, AlertComposerDefinition>);

export function getAlertComposerDefinition(intent: BroadcastIntent) { return alertComposerDefinitions[intent]; }

export const alertCtaDefaults: Readonly<Record<BroadcastIntent, string | null>> = Object.freeze({
  new_video: "Watch video",
  livestream: "Watch live",
  podcast_episode: "Listen now",
  product_release: "View release",
  event: "View event",
  general_announcement: null,
  community_update: null,
  account_hacked: "Find me here",
  account_banned: "Find me here",
  account_inaccessible: "Find me here",
  impersonation_warning: "Find me here",
  platform_migration: "Find me here",
});

export function getAlertCtaDefault(intent: BroadcastIntent) { return alertCtaDefaults[intent]; }

export type AlertAudienceCopyDefinition = {
  intent: BroadcastIntent;
  preferenceLabel: string;
  recipientNoun: string;
  optInCopy: string;
  selectedContextCopy: string | null;
  zeroInsight: string;
  zeroResultHeading: string;
  zeroScheduleHeading: string;
  zeroScheduleMessage: string;
};

export const alertAudienceCopyDefinitions = freezeDefinitionMap({
  new_video:{intent:"new_video",preferenceLabel:"Video updates",recipientNoun:"video alert",optInCopy:"opted in to receive video updates",selectedContextCopy:"Your selected accounts only show where the video is available.",zeroInsight:"No Recovery Pass followers are currently opted in to video updates. Your draft is safe, but nobody can receive this video alert yet.",zeroResultHeading:"No followers are currently opted in to receive video updates.",zeroScheduleHeading:"This video alert can’t be scheduled yet",zeroScheduleMessage:"No eligible followers are currently opted in to receive video updates. Your draft is safe, but no schedule was created."},
  livestream:{intent:"livestream",preferenceLabel:"Livestream updates",recipientNoun:"livestream alert",optInCopy:"opted in to receive livestream updates",selectedContextCopy:"Your selected accounts only show where you’re going live.",zeroInsight:"No Recovery Pass followers are currently opted in to livestream updates. Your draft is safe, but nobody can receive this alert yet.",zeroResultHeading:"No followers are currently opted in to receive livestream updates.",zeroScheduleHeading:"This livestream alert can’t be scheduled yet",zeroScheduleMessage:"No eligible followers are currently opted in to receive livestream alerts. Your draft is safe, but no schedule was created."},
  podcast_episode:{intent:"podcast_episode",preferenceLabel:"Podcast updates",recipientNoun:"episode alert",optInCopy:"opted in to receive podcast updates",selectedContextCopy:"Your selected accounts only show where the episode is available.",zeroInsight:"No Recovery Pass followers are currently opted in to podcast updates. Your draft is safe, but nobody can receive this episode alert yet.",zeroResultHeading:"No followers are currently opted in to receive podcast updates.",zeroScheduleHeading:"This podcast update can’t be scheduled yet",zeroScheduleMessage:"No eligible followers are currently opted in to receive podcast updates. Your draft is safe, but no schedule was created."},
  product_release:{intent:"product_release",preferenceLabel:"Product updates",recipientNoun:"product update",optInCopy:"opted in to receive product updates",selectedContextCopy:"Connected accounts provide release context, not recipients.",zeroInsight:"No Recovery Pass followers are currently opted in to product updates. Your draft is safe, but nobody can receive this product update yet.",zeroResultHeading:"No followers are currently opted in to receive product updates.",zeroScheduleHeading:"This product update can’t be scheduled yet",zeroScheduleMessage:"No eligible followers are currently opted in to receive product updates. Your draft is safe, but no schedule was created."},
  event:{intent:"event",preferenceLabel:"Event and announcement updates",recipientNoun:"event alert",optInCopy:"opted in to receive event or announcement updates",selectedContextCopy:"Your selected accounts only show where the event is available.",zeroInsight:"No Recovery Pass followers are currently opted in to event or announcement updates. Your draft is safe, but nobody can receive this event alert yet.",zeroResultHeading:"No followers are currently opted in to receive event or announcement updates.",zeroScheduleHeading:"This event update can’t be scheduled yet",zeroScheduleMessage:"No eligible followers are currently opted in to receive event updates. Your draft is safe, but no schedule was created."},
  general_announcement:{intent:"general_announcement",preferenceLabel:"Announcements",recipientNoun:"announcement",optInCopy:"opted in to announcements",selectedContextCopy:"Your selected accounts provide context only; Recovery Pass consent determines recipients.",zeroInsight:"No Recovery Pass followers are currently opted in to announcements. Your draft is safe, but nobody can receive this update yet.",zeroResultHeading:"No followers are currently opted in to receive announcements.",zeroScheduleHeading:"This announcement can’t be scheduled yet",zeroScheduleMessage:"No eligible followers are currently opted in to receive announcements. Your draft is safe, but no schedule was created."},
  community_update:{intent:"community_update",preferenceLabel:"Community and announcement updates",recipientNoun:"community update",optInCopy:"opted in to community or announcement updates",selectedContextCopy:"Your selected accounts provide context only; Recovery Pass consent determines recipients.",zeroInsight:"No Recovery Pass followers are currently opted in to community or announcement updates. Your draft is safe, but nobody can receive this message yet.",zeroResultHeading:"No followers are currently opted in to receive community or announcement updates.",zeroScheduleHeading:"This community update can’t be scheduled yet",zeroScheduleMessage:"No eligible followers are currently opted in to receive community updates. Your draft is safe, but no schedule was created."},
  account_hacked:{intent:"account_hacked",preferenceLabel:"Mandatory Recovery Pass",recipientNoun:"recovery alert",optInCopy:"eligible under your Recovery Pass emergency communication rules",selectedContextCopy:"The selected Main account identifies the affected account; it does not create recipients.",zeroInsight:"No Recovery Pass followers are currently eligible under your emergency communication rules. Your draft is safe and nothing can be sent yet.",zeroResultHeading:"No Recovery Pass followers can currently receive this recovery alert.",zeroScheduleHeading:"This Emergency Alert can’t be scheduled yet",zeroScheduleMessage:"No eligible followers from the selected Main and Recovery accounts are currently opted in to receive this Emergency Alert. Your draft is safe, but no schedule was created."},
  account_banned:{intent:"account_banned",preferenceLabel:"Mandatory Recovery Pass",recipientNoun:"recovery alert",optInCopy:"eligible under your Recovery Pass emergency communication rules",selectedContextCopy:"The selected Main account identifies the affected account; it does not create recipients.",zeroInsight:"No Recovery Pass followers are currently eligible under your emergency communication rules. Your draft is safe and nothing can be sent yet.",zeroResultHeading:"No Recovery Pass followers can currently receive this recovery alert.",zeroScheduleHeading:"This Emergency Alert can’t be scheduled yet",zeroScheduleMessage:"No eligible followers from the selected Main and Recovery accounts are currently opted in to receive this Emergency Alert. Your draft is safe, but no schedule was created."},
  account_inaccessible:{intent:"account_inaccessible",preferenceLabel:"Mandatory Recovery Pass",recipientNoun:"recovery alert",optInCopy:"eligible under your Recovery Pass emergency communication rules",selectedContextCopy:"The selected Main account identifies the affected account; it does not create recipients.",zeroInsight:"No Recovery Pass followers are currently eligible under your emergency communication rules. Your draft is safe and nothing can be sent yet.",zeroResultHeading:"No Recovery Pass followers can currently receive this recovery alert.",zeroScheduleHeading:"This Emergency Alert can’t be scheduled yet",zeroScheduleMessage:"No eligible followers from the selected Main and Recovery accounts are currently opted in to receive this Emergency Alert. Your draft is safe, but no schedule was created."},
  impersonation_warning:{intent:"impersonation_warning",preferenceLabel:"Mandatory Recovery Pass",recipientNoun:"security alert",optInCopy:"eligible under your Recovery Pass emergency communication rules",selectedContextCopy:"The selected Main account identifies the affected account; it does not create recipients.",zeroInsight:"No Recovery Pass followers are currently eligible under your emergency communication rules. Your draft is safe and nothing can be sent yet.",zeroResultHeading:"No Recovery Pass followers can currently receive this security alert.",zeroScheduleHeading:"This security alert can’t be scheduled yet",zeroScheduleMessage:"No eligible followers from the selected Main and Recovery accounts are currently opted in to receive this security alert. Your draft is safe, but no schedule was created."},
  platform_migration:{intent:"platform_migration",preferenceLabel:"Mandatory Recovery Pass",recipientNoun:"migration alert",optInCopy:"eligible under your Recovery Pass migration communication rules",selectedContextCopy:"The selected Main account identifies the account being replaced; it does not create recipients.",zeroInsight:"No Recovery Pass followers are currently eligible for this migration alert. Your draft is safe and nothing can be sent yet.",zeroResultHeading:"No Recovery Pass followers can currently receive this migration alert.",zeroScheduleHeading:"This migration alert can’t be scheduled yet",zeroScheduleMessage:"No eligible followers from the selected accounts are currently opted in to receive this migration alert. Your draft is safe, but no schedule was created."},
} satisfies Record<BroadcastIntent, AlertAudienceCopyDefinition>);

export function getAlertAudienceCopyDefinition(intent: BroadcastIntent) { return alertAudienceCopyDefinitions[intent]; }

export const intentDefinitions: IntentDefinition[] = [
  { intent: "account_hacked", group: "protect", title: "Account hacked", description: "Warn followers connected through a compromised account.", broadcastType: "account_update", platform: "required", category: "recovery", mandatory: true, action: "Send Recovery Alert", placeholder: "Tell followers what happened, what they should avoid, and where they can find you." },
  { intent: "account_banned", group: "protect", title: "Account banned or suspended", description: "Keep your Recovery Pass followers informed while access is restricted.", broadcastType: "account_update", platform: "required", category: "recovery", mandatory: true, action: "Send Recovery Alert", placeholder: "Explain which account is unavailable and where followers can find verified updates." },
  { intent: "account_inaccessible", group: "protect", title: "Account inaccessible", description: "Reach followers when you cannot access an account.", broadcastType: "account_update", platform: "required", category: "recovery", mandatory: true, action: "Notify Platform Followers", placeholder: "Explain the access problem, what followers should know, and what happens next." },
  { intent: "impersonation_warning", group: "protect", title: "Impersonation or security warning", description: "Identify an unsafe account or message.", broadcastType: "account_update", platform: "required", category: "recovery", mandatory: true, action: "Send Security Alert", placeholder: "Describe what followers should not trust and where they can verify your identity." },
  { intent: "platform_migration", group: "protect", title: "Platform migration", description: "Guide your Recovery Pass followers to your verified destination.", broadcastType: "account_update", platform: "required", category: "recovery", mandatory: true, action: "Notify Recovery Pass Followers", placeholder: "Explain the move, the verified destination, and what followers should expect." },
  { intent: "new_video", group: "share", title: "New video", description: "Notify interested followers, optionally for one platform.", broadcastType: "new_content", platform: "optional", category: "videos", mandatory: false, action: "Publish New Video", placeholder: "Introduce the release and tell followers why it is worth watching." },
  { intent: "livestream", group: "share", title: "Livestream", description: "Invite followers who enabled live notifications.", broadcastType: "livestream", platform: "optional", category: "livestreams", mandatory: false, action: "Notify Livestream Followers", placeholder: "Tell followers when you are going live and what they can expect." },
  { intent: "podcast_episode", group: "share", title: "Podcast episode", description: "Share a new episode with content subscribers.", broadcastType: "new_content", platform: "optional", category: "videos", mandatory: false, action: "Publish Episode", placeholder: "Introduce the episode and the idea listeners will take away." },
  { intent: "product_release", group: "share", title: "Product release", description: "Reach followers who opted into product news.", broadcastType: "product_launch", platform: "optional", category: "products", mandatory: false, action: "Publish Product Release", placeholder: "Share what you released, why it matters, and where followers can learn more." },
  { intent: "event", group: "share", title: "Event", description: "Share an event with announcement subscribers.", broadcastType: "event", platform: "optional", category: "announcements", mandatory: false, action: "Publish Event", placeholder: "Share when and where the event happens and what followers can expect." },
  { intent: "general_announcement", group: "share", title: "General announcement", description: "Send a preference-based email update.", broadcastType: "announcement", platform: "optional", category: "announcements", mandatory: false, action: "Publish Announcement", placeholder: "Share the news clearly and tell followers what happens next." },
  { intent: "community_update", group: "share", title: "Community update", description: "Keep announcement subscribers in the loop.", broadcastType: "announcement", platform: "optional", category: "announcements", mandatory: false, action: "Publish Update", placeholder: "Tell your community what changed and why it matters." },
];

const emergencyIntents = new Set<BroadcastIntent>([
  "account_hacked", "account_banned", "account_inaccessible",
  "impersonation_warning", "platform_migration",
]);

export type CanonicalBroadcastKind = "update" | "emergency";

export function classifyBroadcastIntent(intent: BroadcastIntent) {
  const definition = getIntentDefinition(intent);
  return {
    kind: (emergencyIntents.has(intent) ? "emergency" : "update") as CanonicalBroadcastKind,
    subtype: intent,
    broadcastType: definition.broadcastType,
  };
}

export function getAudienceRule({
  intent,
  affectedPlatformConnectionId: _affectedPlatformConnectionId,
}: {
  intent: BroadcastIntent;
  affectedPlatformConnectionId: string | null;
}): AudienceRule {
  void _affectedPlatformConnectionId;
  if (emergencyIntents.has(intent)) return "category_followers";
  return "category_followers";
}

export function getIntentDefinition(intent: BroadcastIntent) {
  return intentDefinitions.find((item) => item.intent === intent) ?? intentDefinitions[5];
}

export function intentFromBroadcastType(type: BroadcastType): BroadcastIntent {
  return type === "account_update" ? "account_hacked"
    : type === "livestream" ? "livestream"
      : type === "product_launch" ? "product_release"
        : type === "event" ? "event"
          : type === "announcement" ? "general_announcement"
            : "new_video";
}

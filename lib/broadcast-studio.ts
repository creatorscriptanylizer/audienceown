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

export const intentDefinitions: IntentDefinition[] = [
  { intent: "account_hacked", group: "protect", title: "Account hacked", description: "Warn followers connected through a compromised account.", broadcastType: "account_update", platform: "required", category: "recovery", mandatory: true, action: "Send Recovery Alert", placeholder: "Tell followers what happened, what they should avoid, and where they can find you." },
  { intent: "account_banned", group: "protect", title: "Account banned or suspended", description: "Keep platform followers informed while access is restricted.", broadcastType: "account_update", platform: "required", category: "recovery", mandatory: true, action: "Send Recovery Alert", placeholder: "Explain which account is unavailable and where followers can find verified updates." },
  { intent: "account_inaccessible", group: "protect", title: "Account inaccessible", description: "Reach followers when you cannot access an account.", broadcastType: "account_update", platform: "required", category: "recovery", mandatory: true, action: "Notify Platform Followers", placeholder: "Explain the access problem, what followers should know, and what happens next." },
  { intent: "impersonation_warning", group: "protect", title: "Impersonation or security warning", description: "Identify an unsafe account or message.", broadcastType: "account_update", platform: "required", category: "recovery", mandatory: true, action: "Send Security Alert", placeholder: "Describe what followers should not trust and where they can verify your identity." },
  { intent: "platform_migration", group: "protect", title: "Platform migration", description: "Guide platform followers to your verified destination.", broadcastType: "account_update", platform: "required", category: "recovery", mandatory: true, action: "Notify Platform Followers", placeholder: "Explain the move, the verified destination, and what followers should expect." },
  { intent: "new_video", group: "share", title: "New video", description: "Notify interested followers, optionally for one platform.", broadcastType: "new_content", platform: "optional", category: "videos", mandatory: false, action: "Publish New Video", placeholder: "Introduce the release and tell followers why it is worth watching." },
  { intent: "livestream", group: "share", title: "Livestream", description: "Invite followers who enabled live notifications.", broadcastType: "livestream", platform: "optional", category: "livestreams", mandatory: false, action: "Notify Livestream Followers", placeholder: "Tell followers when you are going live and what they can expect." },
  { intent: "podcast_episode", group: "share", title: "Podcast episode", description: "Share a new episode with content subscribers.", broadcastType: "new_content", platform: "none", category: "videos", mandatory: false, action: "Publish Episode", placeholder: "Introduce the episode and the idea listeners will take away." },
  { intent: "product_release", group: "share", title: "Product release", description: "Reach followers who opted into product news.", broadcastType: "product_launch", platform: "none", category: "products", mandatory: false, action: "Publish Product Release", placeholder: "Share what you released, why it matters, and where followers can learn more." },
  { intent: "event", group: "share", title: "Event", description: "Share an event with announcement subscribers.", broadcastType: "event", platform: "none", category: "announcements", mandatory: false, action: "Publish Event", placeholder: "Share when and where the event happens and what followers can expect." },
  { intent: "general_announcement", group: "share", title: "General announcement", description: "Send a preference-based email update.", broadcastType: "announcement", platform: "none", category: "announcements", mandatory: false, action: "Publish Announcement", placeholder: "Share the news clearly and tell followers what happens next." },
  { intent: "community_update", group: "share", title: "Community update", description: "Keep announcement subscribers in the loop.", broadcastType: "announcement", platform: "none", category: "announcements", mandatory: false, action: "Publish Update", placeholder: "Tell your community what changed and why it matters." },
];

const emergencyIntents = new Set<BroadcastIntent>([
  "account_hacked", "account_banned", "account_inaccessible",
  "impersonation_warning", "platform_migration",
]);

export function getAudienceRule({
  intent,
  affectedPlatformConnectionId,
}: {
  intent: BroadcastIntent;
  affectedPlatformConnectionId: string | null;
}): AudienceRule {
  if (emergencyIntents.has(intent)) return "affected_platform";
  if ((intent === "new_video" || intent === "livestream") && affectedPlatformConnectionId) {
    return "platform_followers";
  }
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

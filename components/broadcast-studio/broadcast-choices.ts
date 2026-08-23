import { CalendarDays, Megaphone, Mic2, Package, Play, Radio, Route, ShieldAlert, Users } from "lucide-react";
import type { BroadcastIntent } from "@/lib/broadcast-studio";

export const emergencySubtypes = [
  { value: "account_hacked", label: "Account hacked", description: "Someone gained unauthorised access to the account." },
  { value: "account_banned", label: "Account suspended", description: "The platform restricted or removed access." },
  { value: "account_inaccessible", label: "Cannot access the account", description: "The account is unavailable or you cannot sign in." },
  { value: "impersonation_warning", label: "Being impersonated", description: "A fake account or unsafe message is misleading followers." },
] as const;

export const broadcastChoices = [
  { intent: "account_inaccessible", group: "protect", title: "Account inaccessible", description: "Alert followers when an account is hacked, suspended, inaccessible, or being impersonated.", delivery: "Mandatory Recovery Pass", icon: ShieldAlert, tone: "amber" },
  { intent: "platform_migration", group: "protect", title: "Platform migration", description: "Guide followers from an old or unavailable account to your verified destination.", delivery: "Mandatory Recovery Pass", icon: Route, tone: "blue" },
  { intent: "new_video", group: "share", title: "New video", description: "Notify followers interested in your latest video.", delivery: "Preference-based · Videos", icon: Play, tone: "violet" },
  { intent: "livestream", group: "share", title: "Livestream", description: "Invite followers who enabled livestream notifications.", delivery: "Preference-based · Livestreams", icon: Radio, tone: "magenta" },
  { intent: "podcast_episode", group: "share", title: "Podcast episode", description: "Share a new podcast episode with interested content subscribers.", delivery: "Preference-based · Videos", icon: Mic2, tone: "rose" },
  { intent: "product_release", group: "share", title: "Product release", description: "Reach followers who opted into product updates.", delivery: "Preference-based · Products", icon: Package, tone: "cyan" },
  { intent: "event", group: "share", title: "Event", description: "Invite followers who enabled announcement updates.", delivery: "Preference-based · Announcements", icon: CalendarDays, tone: "green" },
  { intent: "general_announcement", group: "share", title: "General announcement", description: "Send a general update to eligible announcement subscribers.", delivery: "Preference-based · Announcements", icon: Megaphone, tone: "purple" },
  { intent: "community_update", group: "share", title: "Community update", description: "Keep your subscribed community informed.", delivery: "Preference-based · Announcements", icon: Users, tone: "indigo" },
] as const satisfies ReadonlyArray<{
  intent: BroadcastIntent; group: "protect" | "share"; title: string; description: string;
  delivery: string; icon: typeof Play; tone: string;
}>;

export const emergencyIntentValues = emergencySubtypes.map(({ value }) => value);

export function isAccountEmergency(intent: BroadcastIntent) {
  return emergencyIntentValues.includes(intent as (typeof emergencyIntentValues)[number]);
}

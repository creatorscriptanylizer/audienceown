import type { BroadcastIntent } from "@/lib/broadcast-studio";
import type { BroadcastStatus, BroadcastType } from "@/lib/updates";

export type PlatformAccount = {
  id: string; platform: string; account_type: string; label: string;
  url: string; is_primary: boolean; is_public: boolean; position: number;
};

export type AudienceEstimate = {
  eligible: number; duplicates: number; excluded: Record<string, number>;
  byTransport: Record<"email" | "sms" | "whatsapp" | "browser_notification", number>;
};

export type BroadcastValue = {
  id: string; broadcast_type: BroadcastType; broadcast_intent: BroadcastIntent;
  affected_platform_connection_id: string | null;
  status: BroadcastStatus; title: string; subject: string; preview_text: string;
  content: string; cta_label: string | null; cta_url: string | null; scheduled_for: string | null;
};

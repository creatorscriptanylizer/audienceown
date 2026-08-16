import "server-only";
import { pollSocialConnections } from "@/lib/social-providers/polling";

/** Compatibility entry point. YouTube now uses the shared provider polling pipeline. */
export function pollYouTubeConnections(limit = 10) {
  return pollSocialConnections(limit);
}

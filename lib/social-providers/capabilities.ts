import type { ProviderCapabilities } from "./types";
export const noCapabilities: ProviderCapabilities = {
  oauth: false, tokenRefresh: false, tokenRevocation: false, polling: false,
  webhooks: false, contentDetection: false, livestreamDetection: false,
  scheduledContentDetection: false, analytics: true, automaticDrafts: false,
  automaticPublishing: false, manualImport: true,
};
export function capabilities(values: Partial<ProviderCapabilities>): ProviderCapabilities {
  return { ...noCapabilities, ...values };
}

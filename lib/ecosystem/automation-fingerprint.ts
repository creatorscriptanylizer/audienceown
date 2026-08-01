import { createHash } from "node:crypto";
import type { Json } from "@/lib/database.types";
import type { EcosystemProvider } from "./types";

export type AutomationFingerprintState = {
  provider: EcosystemProvider | string;
  destinationType: string;
  stableExternalId?: string | null;
  displayHandle?: string | null;
  displayName?: string | null;
  canonicalUrl: string;
  hostname?: string | null;
  verificationStatus?: string | null;
  visibility?: string | boolean | null;
  authorityState?: string | null;
  parentRelationship?: string | null;
  capabilityState?: Record<string, boolean | string | null | undefined>;
};

const text = (value: unknown): string | null => typeof value === "string" ? value.trim().normalize("NFKC") : null;
export function normalizeAutomationState(input: AutomationFingerprintState) {
  const url = new URL(input.canonicalUrl);
  if (url.protocol !== "https:") throw new Error("Canonical HTTPS URL required");
  url.hash = "";
  const capabilities: Record<string, string | boolean | null> = {};
  for (const [key, value] of Object.entries(input.capabilityState ?? {}).sort(([a], [b]) => a.localeCompare(b))) if (value !== undefined) capabilities[key] = value;
  return {
    provider: String(input.provider).toLowerCase(), destinationType: text(input.destinationType), stableExternalId: text(input.stableExternalId),
    displayHandle: typeof input.displayHandle === "string" ? input.displayHandle.trim().normalize("NFKC").toLowerCase() : null,
    displayName: text(input.displayName), canonicalUrl: url.toString(), hostname: url.hostname.toLowerCase(),
    verificationStatus: text(input.verificationStatus), visibility: input.visibility ?? null, authorityState: text(input.authorityState),
    parentRelationship: text(input.parentRelationship), capabilityState: capabilities,
  };
}
export function fingerprintAutomationState(input: AutomationFingerprintState) {
  return createHash("sha256").update(JSON.stringify(normalizeAutomationState(input))).digest("hex");
}
export type NormalizedChange = { previous: Json; current: Json };
export function diffAutomationStates(previous: AutomationFingerprintState, current: AutomationFingerprintState) {
  const before = normalizeAutomationState(previous), after = normalizeAutomationState(current), changes: Record<string, NormalizedChange> = {};
  for (const key of Object.keys(after) as (keyof typeof after)[]) if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) changes[key] = { previous: before[key], current: after[key] };
  return changes;
}

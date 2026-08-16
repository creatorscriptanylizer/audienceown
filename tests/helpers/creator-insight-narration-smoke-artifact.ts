import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { CreatorInsightNarrationObservation } from "@/lib/dashboard/creator-insight-narration";

export const creatorInsightNarrationSmokeArtifactPath = ".tmp/creator-insight-narration-smoke.json";

export type CreatorInsightNarrationSmokeArtifact = {
  fingerprintPrefix: string | null;
  providerRequestCount: number;
  providerStatus: string;
  hasStructuredText: boolean;
  hasRefusal: boolean;
  incompleteReason: string | null;
  parsed: { title: string; message: string } | null;
  validation: { accepted: boolean; reason: string | null };
  cacheHit: boolean;
  firstCallCacheHit: boolean;
  sameNarration: boolean | null;
  providerErrorClass: string | null;
  httpStatus: number | null;
  providerCode: string | null;
};

export function buildCreatorInsightNarrationSmokeArtifact(observations: CreatorInsightNarrationObservation[], providerRequestCount: number): CreatorInsightNarrationSmokeArtifact {
  const provider = observations.find((value) => value.stage === "provider_completed");
  const parsed = [...observations].reverse().find((value) => value.parsed)?.parsed ?? null;
  const validation = observations.find((value) => value.stage === "validated")?.validation ?? observations.find((value) => value.stage === "fallback")?.validation;
  const cache = observations.find((value) => value.stage === "cache_hit");
  const providerError = observations.find((value) => value.providerError)?.providerError;
  const fallbackReason = validation?.accepted === false ? validation.reason ?? "unknown" : null;
  return {
    fingerprintPrefix: (provider?.fingerprint ?? observations[0]?.fingerprint)?.slice(0, 12) ?? null,
    providerRequestCount,
    providerStatus: provider?.provider?.responseStatus ?? fallbackReason ?? "unknown",
    hasStructuredText: provider?.provider?.hasStructuredText ?? false,
    hasRefusal: provider?.provider?.hasRefusal ?? fallbackReason === "refusal",
    incompleteReason: provider?.provider?.incompleteReason ?? null,
    parsed,
    validation: { accepted: validation?.accepted ?? false, reason: validation?.accepted ? null : fallbackReason },
    cacheHit: cache?.cacheHit ?? false,
    firstCallCacheHit: false,
    sameNarration: null,
    providerErrorClass: providerError?.providerErrorClass ?? null,
    httpStatus: providerError?.httpStatus ?? null,
    providerCode: providerError?.providerCode ?? null,
  };
}

export async function writeAndReadCreatorInsightNarrationSmokeArtifact(artifact: CreatorInsightNarrationSmokeArtifact, path = creatorInsightNarrationSmokeArtifactPath) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(artifact, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  return JSON.parse(await readFile(path, "utf8")) as CreatorInsightNarrationSmokeArtifact;
}

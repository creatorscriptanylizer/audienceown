import { afterAll, describe, expect, it } from "vitest";
import { rm } from "node:fs/promises";
import type { CreatorInsightNarrationObservation } from "@/lib/dashboard/creator-insight-narration";
import { buildCreatorInsightNarrationSmokeArtifact, writeAndReadCreatorInsightNarrationSmokeArtifact } from "./helpers/creator-insight-narration-smoke-artifact";

const fingerprint = "abcdef1234567890";
const safe = { title: "Your recovery network is gaining momentum", message: "24 new people joined your recovery network in the last 7 days." };
const provider = (status: "completed" | "incomplete" = "completed", hasStructuredText = true, hasRefusal = false, incompleteReason?: string): CreatorInsightNarrationObservation => ({ stage: "provider_completed", fingerprint: fingerprint.slice(0, 12), cacheHit: false, providerRequestCount: 1, provider: { responseStatus: status, hasStructuredText, hasRefusal, ...(incompleteReason ? { incompleteReason } : {}) } });
const fallback = (reason: string): CreatorInsightNarrationObservation => ({ stage: "fallback", fingerprint, cacheHit: false, providerRequestCount: 1, validation: { accepted: false, reason } });

afterAll(async () => { await rm(".tmp/creator-insight-narration-smoke-mock.json", { force: true }); });

describe("creator insight narration smoke artifact", () => {
  it.each([
    ["completed accepted", [provider(), { stage: "parsed", fingerprint, cacheHit: false, providerRequestCount: 1, parsed: safe }, { stage: "validated", fingerprint, cacheHit: false, providerRequestCount: 1, parsed: safe, validation: { accepted: true } }], { providerStatus: "completed", hasStructuredText: true, hasRefusal: false, parsed: safe, validation: { accepted: true, reason: null } }],
    ["completed rejected", [provider(), { stage: "parsed", fingerprint, cacheHit: false, providerRequestCount: 1, parsed: safe }, { stage: "validated", fingerprint, cacheHit: false, providerRequestCount: 1, parsed: safe, validation: { accepted: false, reason: "unsupported_claim" } }, fallback("unsupported_claim")], { providerStatus: "completed", parsed: safe, validation: { accepted: false, reason: "unsupported_claim" } }],
    ["refusal", [provider("completed", false, true), fallback("refusal")], { providerStatus: "completed", hasStructuredText: false, hasRefusal: true, validation: { accepted: false, reason: "refusal" } }],
    ["incomplete", [provider("incomplete", false, false, "max_output_tokens"), fallback("incomplete")], { providerStatus: "incomplete", incompleteReason: "max_output_tokens", validation: { accepted: false, reason: "incomplete" } }],
    ["missing output", [provider("completed", false), fallback("missing_output")], { providerStatus: "completed", hasStructuredText: false, validation: { accepted: false, reason: "missing_output" } }],
    ["parse failure", [provider(), fallback("parse_failed")], { providerStatus: "completed", hasStructuredText: true, validation: { accepted: false, reason: "parse_failed" } }],
    ["timeout", [fallback("timeout")], { providerStatus: "timeout", validation: { accepted: false, reason: "timeout" } }],
    ["provider error", [{ ...fallback("provider_error"), providerError: { providerErrorClass: "insufficient_quota", httpStatus: 429, providerCode: "insufficient_quota" } }], { providerStatus: "provider_error", providerErrorClass: "insufficient_quota", httpStatus: 429, providerCode: "insufficient_quota", validation: { accepted: false, reason: "provider_error" } }],
  ] as Array<[string, CreatorInsightNarrationObservation[], Record<string, unknown>]>)("writes and reads sanitized %s state", async (_name, observations, expected) => {
    const artifact = buildCreatorInsightNarrationSmokeArtifact(observations, 1);
    const roundTrip = await writeAndReadCreatorInsightNarrationSmokeArtifact(artifact, ".tmp/creator-insight-narration-smoke-mock.json");
    expect(roundTrip).toEqual(artifact);
    expect(roundTrip).toMatchObject({ fingerprintPrefix: fingerprint.slice(0, 12), providerRequestCount: 1, cacheHit: false, ...expected });
    const serialized = JSON.stringify(roundTrip).toLowerCase();
    for (const forbidden of ["api_key", "prompt", "response_body", "headers", "email", "phone", "oauth", "access_token", "refresh_token", "cookie", "supabase", "dashboard"]) expect(serialized).not.toContain(forbidden);
  });
});

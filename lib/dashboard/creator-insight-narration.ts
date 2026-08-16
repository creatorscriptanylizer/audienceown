import "server-only";

import { createHash } from "node:crypto";
import OpenAI from "openai";
import { platformPresentation } from "./platform-presentation";
import type { CreatorInsight } from "./creator-insights";

export type CreatorInsightNarration = { title: string; message: string };

export type CreatorInsightNarrationFacts = {
  protectedAudience?: number;
  recoveryConnections?: number;
  growth7d?: number;
  readinessPercent?: number;
  draftCount?: number;
  deliveredCount?: number;
  scheduledTitle?: string;
  scheduledAt?: string;
  scheduledRelative?: "today" | "tomorrow";
  providerLabel?: string;
  destinationOptIns?: number;
  milestone?: number;
};

export type CreatorInsightNarrationInput = {
  insightId: string;
  category: CreatorInsight["category"];
  tone: CreatorInsight["tone"];
  deterministicTitle: string;
  deterministicMessage: string;
  facts: CreatorInsightNarrationFacts;
};

export type NarrationFallbackReason = "disabled" | "ineligible_category" | "missing_configuration" | "timeout" | "provider_error" | "refusal" | "incomplete" | "missing_output" | "parse_failed" | "schema_invalid" | "unsupported_number" | "unsupported_provider" | "unsupported_claim";
type ProviderCompletedObservation = { responseStatus: "completed" | "incomplete" | "failed" | "other"; hasStructuredText: boolean; hasRefusal: boolean; incompleteReason?: string };
export type CreatorInsightNarrationProviderErrorClass = "authentication_error" | "permission_denied" | "insufficient_quota" | "rate_limit" | "model_not_found" | "model_not_allowed" | "invalid_request" | "server_error" | "network_error" | "unknown_provider_error";
export type CreatorInsightNarrationProviderError = { providerErrorClass: CreatorInsightNarrationProviderErrorClass; httpStatus?: number; providerCode?: string };
type NarrationRequest = (input: CreatorInsightNarrationInput, options: { model: string; timeoutMs: number; onProviderCompleted?: (observation: ProviderCompletedObservation) => void }) => Promise<unknown>;
export type CreatorInsightNarrationObservation = {
  stage: "provider_completed" | "parsed" | "validated" | "cache_hit" | "fallback";
  fingerprint: string;
  cacheHit: boolean;
  providerRequestCount?: number;
  parsed?: CreatorInsightNarration;
  validation?: { accepted: boolean; reason?: string };
  provider?: ProviderCompletedObservation;
  providerError?: CreatorInsightNarrationProviderError;
};
type NarrationObserver = (observation: CreatorInsightNarrationObservation) => void;
type NarrationOptions = { request?: NarrationRequest; now?: number; observer?: NarrationObserver };

const NARRATION_VERSION = 1;
const CACHE_TTL_MS = 6 * 60 * 60 * 1_000;
const CACHE_MAX_ENTRIES = 256;
const narrationCache = new Map<string, { value: CreatorInsightNarration; expiresAt: number }>();
const inFlight = new Map<string, Promise<CreatorInsightNarration | null>>();
const schema = { type: "object", additionalProperties: false, required: ["title", "message"], properties: { title: { type: "string", maxLength: 80 }, message: { type: "string", maxLength: 180 } } } as const;
const providerLabels = [...new Set(Object.values(platformPresentation).map((provider) => provider.label))].sort((a, b) => b.length - a.length);

function config() {
  const timeout = Number(process.env.CREATOR_INSIGHT_NARRATION_TIMEOUT_MS ?? 1800);
  return { enabled: process.env.CREATOR_INSIGHT_NARRATION_ENABLED === "true", model: process.env.OPENAI_CREATOR_INSIGHT_MODEL?.trim() ?? "", apiKey: process.env.OPENAI_API_KEY?.trim() ?? "", timeoutMs: Math.max(500, Math.min(Number.isFinite(timeout) ? timeout : 1800, 5_000)) };
}

export function buildCreatorInsightNarrationInput(insight: CreatorInsight): CreatorInsightNarrationInput {
  const metadata = insight.metadata ?? {};
  const numeric = (key: string) => typeof metadata[key] === "number" && Number.isFinite(metadata[key]) ? metadata[key] as number : undefined;
  const text = (key: string) => typeof metadata[key] === "string" ? metadata[key] as string : undefined;
  const provider = text("provider");
  const protectedAudience = numeric("protectedAudience");
  const milestone = insight.id.startsWith("protected-audience-") ? protectedAudience : undefined;
  return {
    insightId: insight.id,
    category: insight.category,
    tone: insight.tone,
    deterministicTitle: insight.title,
    deterministicMessage: insight.message,
    facts: {
      protectedAudience,
      recoveryConnections: numeric("recoveryConnections"),
      growth7d: numeric("growth7d"),
      readinessPercent: numeric("readiness"),
      draftCount: numeric("drafts"),
      deliveredCount: numeric("deliveredCount"),
      scheduledTitle: text("scheduledTitle"),
      scheduledAt: text("scheduledFor"),
      scheduledRelative: metadata.scheduledRelative === "today" || metadata.scheduledRelative === "tomorrow" ? metadata.scheduledRelative : undefined,
      providerLabel: provider ? platformPresentation[provider]?.label ?? provider : undefined,
      destinationOptIns: numeric("optIns"),
      milestone,
    },
  };
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]));
  return value;
}

export function creatorInsightNarrationFingerprint(input: CreatorInsightNarrationInput) {
  return createHash("sha256").update(JSON.stringify(stable({ version: NARRATION_VERSION, ...input }))).digest("hex");
}

function plainText(value: unknown, maximum: number) {
  if (typeof value !== "string") return false;
  const text = value.trim();
  return text.length > 0 && text.length <= maximum && !/[<>\[\]{}]|https?:\/\/|www\.|[`*_#]|[\u0000-\u001f\u007f]|\p{Extended_Pictographic}/u.test(text);
}

function numberTokens(value: string) {
  return [...value.matchAll(/(?<![\p{L}\p{N}])\d[\d,]*(?:\.\d+)?/gu)].map((match) => Number(match[0].replaceAll(",", "")));
}

function allowedNumbers(input: CreatorInsightNarrationInput) {
  const values = Object.values(input.facts).filter((value): value is number => typeof value === "number");
  values.push(...numberTokens(`${input.deterministicTitle} ${input.deterministicMessage}`));
  if (input.facts.scheduledAt) {
    const date = new Date(input.facts.scheduledAt);
    if (!Number.isNaN(date.getTime())) values.push(Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: true, timeZone: "UTC" }).format(date).match(/\d+/)?.[0] ?? -1), date.getUTCMinutes());
  }
  return new Set(values);
}

export function validateCreatorInsightNarration(input: CreatorInsightNarrationInput, output: unknown): { ok: true; value: CreatorInsightNarration } | { ok: false; reason: Exclude<NarrationFallbackReason, "disabled" | "ineligible_category" | "missing_configuration" | "timeout" | "provider_error"> } {
  if (!output || typeof output !== "object") return { ok: false, reason: "schema_invalid" };
  const candidate = output as Record<string, unknown>;
  if (Object.keys(candidate).sort().join(",") !== "message,title" || !plainText(candidate.title, 80) || !plainText(candidate.message, 180)) return { ok: false, reason: "schema_invalid" };
  const value = { title: (candidate.title as string).trim(), message: (candidate.message as string).trim() };
  const combined = `${value.title} ${value.message}`;
  const numbers = allowedNumbers(input);
  if (numberTokens(combined).some((mentioned) => !numbers.has(mentioned))) return { ok: false, reason: "unsupported_number" };
  const lower = combined.toLowerCase();
  const suppliedProvider = input.facts.providerLabel?.toLowerCase();
  for (const label of providerLabels) {
    const normalized = label.toLowerCase();
    const mentioned = normalized === "x" ? /(?:^|\s)X(?:[\s.,!?]|$)/.test(combined) : lower.includes(normalized);
    if (mentioned && normalized !== suppliedProvider) return { ok: false, reason: "unsupported_provider" };
  }
  for (const relative of ["today", "tomorrow", "this week"] as const) {
    if (!lower.includes(relative)) continue;
    const allowed = relative === "this week" ? input.facts.growth7d !== undefined : input.facts.scheduledRelative === relative;
    if (!allowed) return { ok: false, reason: "unsupported_claim" };
  }
  if (/\b(opened|clicked|engaged|converted|followed|subscribed|joined discord)\b/i.test(combined)) return { ok: false, reason: "unsupported_claim" };
  if (input.category === "growth" && /\b(declin|shrank|fell|followers?|subscribers?)\w*/i.test(combined)) return { ok: false, reason: "unsupported_claim" };
  if (input.category === "stability" && /\b(growing|growth|momentum|new (?:people|participants?) (?:joined|are joining))\b/i.test(combined)) return { ok: false, reason: "unsupported_claim" };
  if (input.category === "onboarding" && /\b(already|established|protected (?:fans?|participants?) (?:have|are|joined))\b/i.test(combined)) return { ok: false, reason: "unsupported_claim" };
  if (input.category === "scheduling" && input.facts.scheduledAt && /\b(sent|delivered|started|live now)\b/i.test(combined)) return { ok: false, reason: "unsupported_claim" };
  if (input.category === "readiness" && /\b(?:audience|people|fans?)\b[^.!?]{0,30}\b\d[\d,.]*\s*%\s*(?:protected|ready)/i.test(combined)) return { ok: false, reason: "unsupported_claim" };
  return { ok: true, value };
}

function eligible(insight: CreatorInsight) {
  return insight.priority !== "critical" && insight.tone !== "warning" && insight.category !== "connection";
}

function allowedFacts(input: CreatorInsightNarrationInput) {
  const facts = Object.entries(input.facts).filter((entry): entry is [string, string | number] => entry[1] !== undefined);
  if (input.facts.growth7d !== undefined) facts.push(["period", "last 7 days"]);
  return facts.map(([key, value]) => `- ${key} = ${value}`).join("\n") || "- none";
}

function categoryGuidance(category: CreatorInsight["category"]) {
  switch (category) {
    case "growth": return "Keep recovery-growth wording close to the deterministic copy. Preserve the exact phrase 'last 7 days' when present. Do not describe native followers or subscribers.";
    case "stability": return "Describe the established recovery state without claiming recent growth, momentum, or new participants.";
    case "onboarding": return "Describe building a direct audience connection without claiming that participants already exist.";
    case "scheduling": return "Preserve the supplied scheduled title, provider, date, time, and status exactly. Do not imply that the update was already sent.";
    case "readiness": return "Keep readiness separate from audience protection. Never reinterpret a readiness percentage as a protected-audience percentage.";
    case "updates": return "State only verified delivery semantics. Never claim opens, clicks, engagement, conversion, CTR, open rate, or click rate.";
    default: return "Preserve the deterministic category, state, and recovery terminology exactly.";
  }
}

export function buildCreatorInsightNarrationPrompt(input: CreatorInsightNarrationInput) {
  return {
    system: "You are a controlled rephraser, not a creative writer. Return a light rewrite of the supplied deterministic title and message. You may only restate facts explicitly present in deterministicTitle, deterministicMessage, or ALLOWED_FACTS. If a detail is not explicitly supplied, omit it. Do not introduce or infer any number, provider, timeframe, trend, action, status, audience behavior, native follow/subscription claim, engagement claim, or other fact. Do not perform arithmetic, round, abbreviate numbers, calculate percentages, compare values, or convert time phrases. Use only exact supplied numeric values and exact supplied provider labels. Preserve critical recovery nouns and action/state meaning. Never claim opened, clicked, engaged, converted, CTR, open rate, or click rate. Do not add URLs, HTML, Markdown, emoji, actions, urgency, or exaggeration. Never mention AI or databases. Keep title and message distinct and close to the original wording. When uncertain, copy the deterministic wording.",
    user: `Rewrite only title and message. Every factual statement must be directly supported by the deterministic copy or ALLOWED_FACTS.\n\nCATEGORY CONSTRAINT:\n${categoryGuidance(input.category)}\n\nALLOWED_FACTS:\n${allowedFacts(input)}\n\nDETERMINISTIC INPUT:\n${JSON.stringify({ insightId: input.insightId, category: input.category, tone: input.tone, deterministicTitle: input.deterministicTitle, deterministicMessage: input.deterministicMessage })}`,
  };
}

export class CreatorInsightNarrationPreParseError extends Error {
  constructor(readonly reason: "refusal" | "incomplete" | "missing_output" | "parse_failed") { super(reason); }
}

async function requestOpenAiNarration(input: CreatorInsightNarrationInput, options: { model: string; timeoutMs: number; onProviderCompleted?: (observation: ProviderCompletedObservation) => void }) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: options.timeoutMs, maxRetries: 0 });
  const content = buildCreatorInsightNarrationPrompt(input);
  const response = await client.responses.create({ model: options.model, store: false, max_output_tokens: 120, input: [{ role: "system", content: content.system }, { role: "user", content: content.user }], text: { format: { type: "json_schema", name: "creator_insight_narration", strict: true, schema } } });
  const hasRefusal = response.output.some((item) => item.type === "message" && item.content.some((part) => part.type === "refusal"));
  const status = response.status === "completed" || response.status === "incomplete" || response.status === "failed" ? response.status : "other";
  const provider = { responseStatus: status, hasStructuredText: response.output_text.length > 0, hasRefusal, ...(response.incomplete_details?.reason ? { incompleteReason: response.incomplete_details.reason } : {}) } satisfies ProviderCompletedObservation;
  try { options.onProviderCompleted?.(provider); } catch { /* Observation must never affect narration. */ }
  if (hasRefusal) throw new CreatorInsightNarrationPreParseError("refusal");
  if (response.status === "incomplete") throw new CreatorInsightNarrationPreParseError("incomplete");
  if (!response.output_text) throw new CreatorInsightNarrationPreParseError("missing_output");
  try { return JSON.parse(response.output_text) as unknown; } catch { throw new CreatorInsightNarrationPreParseError("parse_failed"); }
}

function log(event: "creator_insight_narration_completed" | "creator_insight_narration_fallback" | "creator_insight_narration_configuration", fields: Record<string, string | number | boolean>) {
  const method = event === "creator_insight_narration_completed" ? console.info : console.warn;
  method(JSON.stringify({ event, ...fields }));
}

function observe(observer: NarrationObserver | undefined, observation: CreatorInsightNarrationObservation) {
  try { observer?.(observation); } catch { /* Observation must never affect narration. */ }
}

function boundedProviderCode(value: unknown) {
  return typeof value === "string" && /^[a-z0-9_.-]{1,64}$/i.test(value) ? value : undefined;
}

export function classifyCreatorInsightNarrationProviderError(error: unknown): CreatorInsightNarrationProviderError {
  if (error instanceof OpenAI.APIConnectionError) return { providerErrorClass: "network_error" };
  if (!(error instanceof OpenAI.APIError)) return { providerErrorClass: "unknown_provider_error" };
  const httpStatus = error.status;
  const providerCode = boundedProviderCode(error.code) ?? boundedProviderCode(error.type);
  const code = providerCode?.toLowerCase();
  const fields = { ...(typeof httpStatus === "number" ? { httpStatus } : {}), ...(providerCode ? { providerCode } : {}) };
  if (httpStatus === 401) return { providerErrorClass: "authentication_error", ...fields };
  if (httpStatus === 403) return { providerErrorClass: code?.includes("model") ? "model_not_allowed" : "permission_denied", ...fields };
  if (httpStatus === 404) return { providerErrorClass: "model_not_found", ...fields };
  if (httpStatus === 429) return { providerErrorClass: code === "insufficient_quota" ? "insufficient_quota" : "rate_limit", ...fields };
  if (httpStatus === 400 || httpStatus === 409 || httpStatus === 422) return { providerErrorClass: "invalid_request", ...fields };
  if (typeof httpStatus === "number" && httpStatus >= 500) return { providerErrorClass: "server_error", ...fields };
  return { providerErrorClass: "unknown_provider_error", ...fields };
}

export async function getNarratedCreatorInsight(insight: CreatorInsight, options: NarrationOptions = {}): Promise<CreatorInsight> {
  if (!eligible(insight)) return insight;
  const settings = config();
  if (!settings.enabled) return insight;
  const input = buildCreatorInsightNarrationInput(insight);
  const fingerprint = creatorInsightNarrationFingerprint(input);
  const prefix = fingerprint.slice(0, 12);
  if (!settings.apiKey || !settings.model) {
    log("creator_insight_narration_configuration", { category: insight.category, reason: "missing_configuration", fingerprint: prefix });
    return insight;
  }
  const now = options.now ?? Date.now();
  const cached = narrationCache.get(fingerprint);
  if (cached && cached.expiresAt > now) {
    observe(options.observer, { stage: "cache_hit", fingerprint, cacheHit: true, providerRequestCount: 0, parsed: cached.value, validation: { accepted: true } });
    log("creator_insight_narration_completed", { category: insight.category, latencyMs: 0, cacheHit: true, model: settings.model, fingerprint: prefix });
    return { ...insight, title: cached.value.title, message: cached.value.message };
  }
  if (cached) narrationCache.delete(fingerprint);
  const existing = inFlight.get(fingerprint);
  if (existing) {
    const narration = await existing;
    return narration ? { ...insight, ...narration } : insight;
  }
  const started = Date.now();
  const request = options.request ?? requestOpenAiNarration;
  const work = (async () => {
    let providerRequestCount = 0;
    try {
      providerRequestCount += 1;
      const raw = await request(input, { model: settings.model, timeoutMs: settings.timeoutMs, onProviderCompleted: (provider) => observe(options.observer, { stage: "provider_completed", fingerprint: prefix, cacheHit: false, providerRequestCount, provider }) });
      const parsed = raw && typeof raw === "object" && typeof (raw as Record<string, unknown>).title === "string" && typeof (raw as Record<string, unknown>).message === "string" ? { title: (raw as Record<string, string>).title, message: (raw as Record<string, string>).message } : undefined;
      observe(options.observer, { stage: "parsed", fingerprint, cacheHit: false, providerRequestCount, ...(parsed ? { parsed } : {}) });
      const checked = validateCreatorInsightNarration(input, raw);
      observe(options.observer, { stage: "validated", fingerprint, cacheHit: false, providerRequestCount, ...(parsed ? { parsed } : {}), validation: checked.ok ? { accepted: true } : { accepted: false, reason: checked.reason } });
      if (!checked.ok) {
        observe(options.observer, { stage: "fallback", fingerprint, cacheHit: false, providerRequestCount, ...(parsed ? { parsed } : {}), validation: { accepted: false, reason: checked.reason } });
        log("creator_insight_narration_fallback", { category: insight.category, reason: checked.reason, latencyMs: Date.now() - started, cacheHit: false, model: settings.model, fingerprint: prefix });
        return null;
      }
      while (narrationCache.size >= CACHE_MAX_ENTRIES) narrationCache.delete(narrationCache.keys().next().value!);
      narrationCache.set(fingerprint, { value: checked.value, expiresAt: now + CACHE_TTL_MS });
      log("creator_insight_narration_completed", { category: insight.category, latencyMs: Date.now() - started, cacheHit: false, model: settings.model, fingerprint: prefix });
      return checked.value;
    } catch (error) {
      const reason: NarrationFallbackReason = error instanceof CreatorInsightNarrationPreParseError ? error.reason : error instanceof OpenAI.APIConnectionTimeoutError || error instanceof DOMException && error.name === "AbortError" ? "timeout" : error instanceof SyntaxError ? "schema_invalid" : "provider_error";
      const providerError = reason === "provider_error" ? classifyCreatorInsightNarrationProviderError(error) : undefined;
      observe(options.observer, { stage: "fallback", fingerprint, cacheHit: false, providerRequestCount, validation: { accepted: false, reason }, ...(providerError ? { providerError } : {}) });
      log("creator_insight_narration_fallback", { category: insight.category, reason, latencyMs: Date.now() - started, cacheHit: false, model: settings.model, fingerprint: prefix });
      return null;
    }
  })();
  inFlight.set(fingerprint, work);
  try {
    const narration = await work;
    return narration ? { ...insight, ...narration } : insight;
  } finally {
    inFlight.delete(fingerprint);
  }
}

export function resetCreatorInsightNarrationCacheForTests() {
  narrationCache.clear();
  inFlight.clear();
}

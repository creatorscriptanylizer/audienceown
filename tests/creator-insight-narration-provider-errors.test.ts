import OpenAI from "openai";
import { describe, expect, it } from "vitest";
import { classifyCreatorInsightNarrationProviderError } from "@/lib/dashboard/creator-insight-narration";

function apiError(status: number, code?: string, type = "invalid_request_error") {
  return OpenAI.APIError.generate(status, { error: { code, type, message: "must never be observed" } }, undefined, new Headers());
}

describe("creator insight narration provider error classification", () => {
  it.each([
    [apiError(401, "invalid_api_key"), { providerErrorClass: "authentication_error", httpStatus: 401, providerCode: "invalid_api_key" }],
    [apiError(403, "permission_denied"), { providerErrorClass: "permission_denied", httpStatus: 403, providerCode: "permission_denied" }],
    [apiError(403, "model_not_allowed"), { providerErrorClass: "model_not_allowed", httpStatus: 403, providerCode: "model_not_allowed" }],
    [apiError(404, "model_not_found"), { providerErrorClass: "model_not_found", httpStatus: 404, providerCode: "model_not_found" }],
    [apiError(429, "rate_limit_exceeded"), { providerErrorClass: "rate_limit", httpStatus: 429, providerCode: "rate_limit_exceeded" }],
    [apiError(429, "insufficient_quota"), { providerErrorClass: "insufficient_quota", httpStatus: 429, providerCode: "insufficient_quota" }],
    [apiError(400, "invalid_request_error"), { providerErrorClass: "invalid_request", httpStatus: 400, providerCode: "invalid_request_error" }],
    [apiError(500, "server_error", "server_error"), { providerErrorClass: "server_error", httpStatus: 500, providerCode: "server_error" }],
    [new OpenAI.APIConnectionError({ message: "private network detail" }), { providerErrorClass: "network_error" }],
    [new Error("private unknown detail"), { providerErrorClass: "unknown_provider_error" }],
  ] as const)("maps a structured SDK failure without retaining messages", (error, expected) => {
    const classified = classifyCreatorInsightNarrationProviderError(error);
    expect(classified).toEqual(expected);
    const serialized = JSON.stringify(classified);
    expect(serialized).not.toContain("must never be observed");
    expect(serialized).not.toContain("private");
  });

  it("drops unbounded provider codes", () => {
    expect(classifyCreatorInsightNarrationProviderError(apiError(400, "unsafe code with spaces and arbitrary text"))).toEqual({ providerErrorClass: "invalid_request", httpStatus: 400, providerCode: "invalid_request_error" });
  });
});

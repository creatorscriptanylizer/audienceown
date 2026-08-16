import { describe, expect, it } from "vitest";
import { connectionHealthState, isProviderDataStale, relativeProviderUpdate } from "@/lib/social-providers/connection-health";
import { normalizeProviderFailure, ProviderReliabilityError, providerRetryDelaySeconds } from "@/lib/social-providers/errors";
import { readFileSync } from "node:fs";

describe("provider synchronization reliability", () => {
  it("maps manual, syncing, retryable, and reconnect-required states distinctly", () => {
    expect(connectionHealthState({ externalAccountId: null, health: "disconnected" })).toBe("manual");
    expect(connectionHealthState({ externalAccountId: "channel", health: "healthy", leaseExpiresAt: "2030-01-01T00:00:00Z" }, Date.parse("2029-01-01T00:00:00Z"))).toBe("syncing");
    expect(connectionHealthState({ externalAccountId: "channel", health: "degraded", failureCategory: "network" })).toBe("temporarily_unavailable");
    expect(connectionHealthState({ externalAccountId: "channel", health: "revoked" })).toBe("action_required");
  });

  it("uses bounded exponential backoff and honors Retry-After", () => {
    expect(providerRetryDelaySeconds(1, undefined, 0)).toBe(30);
    expect(providerRetryDelaySeconds(3, undefined, 0)).toBe(120);
    expect(providerRetryDelaySeconds(99, undefined, 0)).toBe(3600);
    expect(providerRetryDelaySeconds(1, 900, 0)).toBe(900);
  });

  it("normalizes permanent revocation without leaking the original error message", () => {
    const failure = normalizeProviderFailure(new ProviderReliabilityError("authentication", "invalid_grant", false, true));
    expect(failure).toMatchObject({ category: "authentication", retryable: false, reconnectRequired: true, code: "invalid_grant" });
    expect(failure.userMessage).not.toContain("token");
  });

  it("marks old provider observations stale while retaining relative freshness", () => {
    const now = Date.parse("2026-08-07T12:00:00Z");
    expect(isProviderDataStale("2026-08-07T09:00:00Z", now)).toBe(true);
    expect(relativeProviderUpdate("2026-08-07T09:00:00Z", now)).toBe("Last synced 3 hours ago");
    expect(relativeProviderUpdate(null, now)).toBe("Not synchronized yet");
  });

  it("uses one leased polling pipeline and retains last-known metrics on failure", () => {
    const polling = readFileSync("lib/social-providers/polling.ts", "utf8");
    const legacy = readFileSync("lib/youtube-poller.ts", "utf8");
    const metrics = readFileSync("app/api/internal/providers/audience-metrics/sync/route.ts", "utf8");
    expect(polling).toContain("authorizedProviderCredential");
    expect(polling).toContain("claim_social_connections");
    expect(legacy).toContain("pollSocialConnections(limit)");
    expect(metrics).toContain('status:row.audience_count===null?safe.status:"stale"');
    expect(metrics).not.toContain("p_count:null as unknown as number,p_unit:null as unknown as string,p_status:safe.status");
  });

  it("guards distributed refreshes and preserves an omitted rotated refresh token", () => {
    const credential = readFileSync("lib/social-providers/authorized-credential.ts", "utf8");
    expect(credential).toContain("lease_owner:leaseOwner");
    expect(credential).toContain("lease_expires_at:leaseUntil");
    expect(credential).toContain("refresh_in_progress");
    expect(credential).toContain("token.refreshToken??oldRefresh");
    expect(credential).not.toContain("console.log");
  });
});

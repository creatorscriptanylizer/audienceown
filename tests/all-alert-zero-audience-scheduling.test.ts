import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { alertAudienceCopyDefinitions, broadcastIntents } from "@/lib/broadcast-studio";

const actions = readFileSync("app/dashboard/updates/actions.ts", "utf8");
const delivery = readFileSync("lib/update-delivery.ts", "utf8");
const studio = readFileSync("components/broadcast-studio/broadcast-studio.tsx", "utf8");

describe("all-alert zero-audience scheduling contract", () => {
  it.each(broadcastIntents)("provides canonical schedule copy for %s", (intent) => {
    const copy = alertAudienceCopyDefinitions[intent];
    expect(copy.zeroScheduleHeading).toMatch(/can’t be scheduled yet$/);
    expect(copy.zeroScheduleMessage).toContain("No eligible followers");
    expect(copy.zeroScheduleMessage).toContain("Your draft is safe, but no schedule was created.");
  });

  it("returns one shared operation-aware result for every intent", () => {
    expect(actions).toContain('operation: scheduledFor ? "schedule" : "publish"');
    expect(actions).toContain("audienceCopy.zeroScheduleHeading");
    expect(actions).toContain("audienceCopy.zeroScheduleMessage");
    expect(actions.match(/error\.code === "zero_audience"/g)).toHaveLength(1);
  });

  it("stops before the shared scheduling RPC when the canonical audience is empty", () => {
    expect(delivery.indexOf('resolution.eligible === 0')).toBeLessThan(delivery.indexOf('rpc("publish_update_delivery_queue"'));
    expect(delivery).toContain('throw new PublicationError("zero_audience")');
  });

  it("preserves the post-RPC persisted schedule invariant", () => {
    expect(delivery).toContain('persisted?.status !== "scheduled"');
    expect(delivery).toContain("persisted.scheduled_for !== scheduledFor");
    expect(delivery).toContain('new PublicationError("persistence_invariant_failed")');
  });

  it("uses the shared amber result UI and removes the schedule action after a result", () => {
    expect(studio).toContain('finalResult.kind === "zero_audience" ? <ZeroAudienceSendResult');
    expect(studio).toContain("finalResultVisible ?");
    expect(studio).toContain("Back to draft");
    expect(studio).not.toMatch(/eligible at send time|opts? in before send/i);
  });
});

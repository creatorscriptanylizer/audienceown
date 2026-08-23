import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const studioSource = readFileSync(
  new URL("../components/broadcast-studio/broadcast-studio.tsx", import.meta.url),
  "utf8",
);
const resultSource = readFileSync(
  new URL("../app/dashboard/updates/[id]/page.tsx", import.meta.url),
  "utf8",
);
const actionSource = readFileSync(
  new URL("../app/dashboard/updates/actions.ts", import.meta.url),
  "utf8",
);

describe("creator publishing workflow", () => {
  it("uses the alert-specific send label as the single final action with a pending state", () => {
    expect(studioSource).toContain("composer.sendLabel");
    expect(studioSource).toContain('publishPending ? definition.mandatory ? "Sending emergency alert…" : "Sending…" : composer.sendLabel');
    expect(studioSource).toContain("disabled={committing}");
    expect(studioSource).toContain("closeDisabled={committing}");
  });

  it("offers scheduling with explicit local time, zone, and pending protection", () => {
    expect(studioSource).toContain("<strong>Schedule</strong>");
    expect(studioSource).toContain('name="scheduled_for_local"');
    expect(studioSource).toContain('name="time_zone"');
    expect(studioSource).toContain('"Scheduling…"');
    expect(studioSource).toContain("closeDisabled={committing}");
  });

  it("shows real routing and never embeds a fake audience count", () => {
    expect(studioSource).toContain("realEstimate?.eligible.toLocaleString()");
    expect(studioSource).toContain("exact selected Recovery Pass");
    expect(studioSource).toContain("verified email according to their ${audienceCopy.preferenceLabel.toLowerCase()} consent");
    expect(studioSource).not.toMatch(/\b247\b/);
  });

  it("redirects and renders the stable publication summary names", () => {
    for (const key of ["status", "updateId", "queued", "eligible", "duplicates", "excluded"]) {
      expect(actionSource).toContain(`${key}:`);
    }
    expect(resultSource).toContain('query.status === "published"');
    expect(resultSource).toContain("query.queued");
    expect(resultSource).not.toContain("query.created");
  });

  it("does not expose a second audience-preparation server action", () => {
    expect(actionSource).not.toContain("queueUpdateDeliveries");
    expect(actionSource).not.toContain("createDeliveryQueue");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { alertComposerDefinitions } from "@/lib/broadcast-studio";

const studio = readFileSync("components/broadcast-studio/broadcast-studio.tsx", "utf8");
const actions = readFileSync("app/dashboard/updates/actions.ts", "utf8");
const detailPage = readFileSync("app/dashboard/updates/[id]/page.tsx", "utf8");

describe("shared alert scheduling contract", () => {
  it("keeps the canonical local datetime and timezone mounted through final confirmation", () => {
    expect(studio).toContain('type="hidden" name="scheduled_for_local" value={scheduledLocal}');
    expect(studio).toContain('type="hidden" name="scheduled_date" value={scheduleDate}');
    expect(studio).toContain('type="hidden" name="scheduled_time" value={scheduleTime}');
    expect(studio).toContain('type="hidden" name="scheduled_for_iso" value={scheduledIso}');
    expect(studio).toContain('type="hidden" name="time_zone" value={timeZone}');
    expect(studio).toContain("combineScheduleLocalValue(scheduleDate, scheduleTime)");
  });

  it("logs safe schedule diagnostics and verifies persisted state before redirect", () => {
    expect(actions).toContain('stage: "schedule_input"');
    expect(actions).toContain('stage: "schedule_validation"');
    expect(actions).toContain('stage: "schedule_returning"');
    expect(readFileSync("lib/update-delivery.ts", "utf8")).toContain('stage: "schedule_persisted_state"');
    expect(readFileSync("lib/update-delivery.ts", "utf8")).toContain('persisted?.status !== "scheduled"');
  });

  it("uses separate controlled date and time inputs", () => {
    expect(studio).toContain('aria-label="Schedule date" type="date"');
    expect(studio).toContain('aria-label="Schedule time" type="time"');
    expect(studio).toContain('step="60"');
  });

  it("shows the actual local date, time, and timezone before submission", () => {
    expect(studio).toContain(">Scheduled for<");
    expect(studio).toContain("formatScheduledDate(scheduledIso, timeZone)");
    expect(studio).toContain("<span>{timeZone}</span>");
  });

  it("renders schedule failures prominently in final confirmation", () => {
    expect(studio).toContain('scheduleState.error && <section className="studio-focus-note is-warning" role="alert"');
    expect(studio).toContain("scheduleState.errors?.scheduled_for_local?.[0]");
    expect(actions).toContain("Choose both a schedule date and time.");
  });

  it("preserves pending and duplicate-submission protection", () => {
    expect(studio).toContain('schedulePending ? "Scheduling…" : scheduleLabel');
    expect(studio).toContain("disabled={committing || !scheduledIso}");
    expect(studio).toContain("const committing = publishPending || schedulePending");
  });

  it("uses type-aware schedule labels for all normal shared alerts", () => {
    for (const intent of ["new_video", "livestream", "podcast_episode", "product_release", "event", "general_announcement", "community_update"] as const) {
      expect(alertComposerDefinitions[intent].scheduleLabel).toMatch(/^Schedule /);
    }
    expect(studio).toContain("const scheduleLabel = composer.scheduleLabel");
  });

  it("redirects into the existing scheduled lifecycle success state", () => {
    expect(actions).toContain('redirect(`/dashboard/updates/${id}?${query}`)');
    expect(detailPage).toContain('query.status === "scheduled"');
    expect(detailPage).toContain('scheduleLabel.replace(/^Schedule /, "")');
    expect(detailPage).toContain("scheduled</h2>");
  });

  it("retains server-side future-time and DST-aware validation", () => {
    expect(actions).toContain("validateScheduleInput({ localValue, timeZone, isoValue })");
    expect(actions).toContain("Date.now() + 60_000");
    expect(actions).toContain("This local date and time is invalid. Check daylight-saving changes and try again.");
  });
});

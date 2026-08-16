import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Recovery Analytics route availability", () => {
  it("uses notFound only for an authoritative absent detail", () => {
    const page = read("app/dashboard/analytics/recovery/[id]/page.tsx");
    expect(page).toContain('result.status === "unavailable"');
    expect(page).toContain("Recovery analytics unavailable");
    expect(page).toContain('result.status === "absent"');
    expect(page.indexOf('result.status === "unavailable"')).toBeLessThan(page.indexOf("notFound()"));
  });

  it("returns 503 for unavailable and 404 only for absent from the detail API", () => {
    const route = read("app/api/analytics/recovery/updates/[id]/route.ts");
    expect(route).toContain('result.status === "unavailable"');
    expect(route).toContain('analyticsError("analytics_unavailable", 503)');
    expect(route).toContain('result.status === "absent"');
    expect(route).toContain('analyticsError("not_found", 404)');
  });

  it("does not catch incident failures into an authoritative empty array", () => {
    const page = read("app/dashboard/analytics/recovery/page.tsx");
    expect(page).not.toContain("recoveryIncidents().catch(() => [])");
    expect(page).toContain('incidentsResult.status === "available"');
    expect(page).toContain("incidentsAvailable={incidentsResult.status === \"available\"}");
  });
});

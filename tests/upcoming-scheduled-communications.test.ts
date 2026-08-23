import { describe, expect, it, vi } from "vitest";
import { getUpcomingScheduledCommunications } from "@/lib/upcoming-scheduled-communications";

describe("upcoming scheduled communications query", () => {
  it("uses the shared canonical future lifecycle query", async () => {
    const rows = [{ id: "scheduled-1", status: "scheduled", scheduled_for: "2026-09-06T00:47:00Z" }];
    const chain: Record<string, ReturnType<typeof vi.fn> | ((resolve: (value: unknown) => unknown) => Promise<unknown>)> = {};
    for (const method of ["select", "eq", "not", "gt", "order", "limit"]) chain[method] = vi.fn(() => chain);
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve);
    const db = { from: vi.fn(() => chain) };
    const result = await getUpcomingScheduledCommunications(db as never, "creator-1", new Date("2026-08-19T00:00:00Z"), 25);
    expect(result).toEqual(rows);
    expect(db.from).toHaveBeenCalledWith("creator_updates");
    expect(chain.eq).toHaveBeenCalledWith("creator_id", "creator-1");
    expect(chain.eq).toHaveBeenCalledWith("status", "scheduled");
    expect(chain.not).toHaveBeenCalledWith("scheduled_for", "is", null);
    expect(chain.gt).toHaveBeenCalledWith("scheduled_for", "2026-08-19T00:00:00.000Z");
    expect(chain.order).toHaveBeenCalledWith("scheduled_for", { ascending: true });
    expect(chain.limit).toHaveBeenCalledWith(25);
  });
});

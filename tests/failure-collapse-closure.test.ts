import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const h = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: h.createClient }));

function client(user: { id: string } | null, creator: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq"]) builder[method] = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(async () => creator);
  return { auth: { getUser: vi.fn(async () => ({ data: { user } })) }, from: vi.fn(() => builder) };
}

beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

describe("creator DAL availability", () => {
  it("distinguishes unauthenticated, available, absent, and unavailable", async () => {
    const { getCreatorState } = await import("@/lib/dal");
    h.createClient.mockResolvedValue(client(null, { data: null, error: null }));
    await expect(getCreatorState()).resolves.toEqual({ status: "unauthenticated" });

    h.createClient.mockResolvedValue(client({ id: "user-1" }, { data: { id: "creator-1" }, error: null }));
    await expect(getCreatorState()).resolves.toEqual({ status: "available", creator: { id: "creator-1" } });

    h.createClient.mockResolvedValue(client({ id: "user-1" }, { data: null, error: null }));
    await expect(getCreatorState()).resolves.toEqual({ status: "absent" });

    h.createClient.mockResolvedValue(client({ id: "user-1" }, { data: null, error: { code: "42501" } }));
    await expect(getCreatorState()).resolves.toEqual({ status: "unavailable" });
  });
});

describe("remaining-family source guard", () => {
  const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
  it("requires identity monitoring prerequisite and observation errors", () => {
    const worker = source("lib/identity/monitoring-worker.ts");
    expect(worker).toContain("connectionError");
    expect(worker).toContain("secretError");
    expect(worker).toContain("ingestError");
    expect(worker).toContain("processError");
  });
  it("requires trust detail failures to count as failed, not unknown", () => {
    const worker = source("lib/identity/trust-worker.ts");
    expect(worker).toContain("evaluationError");
    expect(worker).not.toContain('evaluation?.trust_state??"unknown"');
  });
  it("requires emergency verification read errors to remain failures", () => {
    const helper = source("lib/emergency/verification-server.ts");
    for (const name of ["replacementError", "connectionError", "affectedError", "secretError"]) expect(helper).toContain(name);
  });
});

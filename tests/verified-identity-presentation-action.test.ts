import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCreator: vi.fn(),
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/dal", () => ({ requireCreator: mocks.requireCreator }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { saveVerifiedIdentityPresentation } from "@/app/dashboard/authenticity/actions";

function database(saved = { public_title: "Creator · Entrepreneur · Host", public_summary: "I'm Nana Kwame and I am a YouTuber." }) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: saved, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  return { rpc: vi.fn().mockResolvedValue({ error: null }), from: vi.fn(() => ({ select })), eq, maybeSingle };
}

function form(title = "Creator · Entrepreneur · Host", summary = "I'm Nana Kwame and I am a YouTuber.") {
  const data = new FormData();
  data.set("title", title);
  data.set("summary", summary);
  return data;
}

describe("saveVerifiedIdentityPresentation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCreator.mockResolvedValue({ id: "creator-a", public_slug: "nana" });
  });

  it("persists, reads back through the authenticated creator boundary, and revalidates exact routes", async () => {
    const db = database();
    mocks.createClient.mockResolvedValue(db);
    await expect(saveVerifiedIdentityPresentation({}, form())).resolves.toEqual({ success: "Saved" });
    expect(db.rpc).toHaveBeenCalledWith("update_creator_authenticity_profile", expect.objectContaining({ p_public_title: "Creator · Entrepreneur · Host", p_public_summary: "I'm Nana Kwame and I am a YouTuber." }));
    expect(db.from).toHaveBeenCalledWith("creator_authenticity_profiles");
    expect(db.eq).toHaveBeenCalledWith("creator_id", "creator-a");
    expect(mocks.revalidatePath.mock.calls).toEqual([["/dashboard/authenticity"], ["/verify/nana"], ["/c/nana"], ["/nana"]]);
  });

  it("persists empty optional fields as explicit clearing values", async () => {
    const db = database({ public_title: null, public_summary: null } as never);
    mocks.createClient.mockResolvedValue(db);
    await expect(saveVerifiedIdentityPresentation({}, form("", ""))).resolves.toEqual({ success: "Saved" });
    expect(db.rpc).toHaveBeenCalledWith("update_creator_authenticity_profile", expect.objectContaining({ p_public_title: "", p_public_summary: "" }));
  });

  it("does not claim success or revalidate when canonical read-back differs", async () => {
    mocks.createClient.mockResolvedValue(database({ public_title: "stale", public_summary: "stale" }));
    await expect(saveVerifiedIdentityPresentation({}, form())).resolves.toEqual({ error: "Public profile couldn't be saved." });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

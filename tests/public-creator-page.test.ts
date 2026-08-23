import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc })),
}));

import { getPublicCreatorPage, PublicCreatorPageUnavailableError } from "@/lib/public-creator-page";

const payload = {
  profile: {
    slug: "canonical-creator",
    displayName: "Canonical Creator",
    bio: "Canonical biography",
    profileImagePath: "https://example.com/avatar.jpg",
    bannerImagePath: "https://example.com/banner.jpg",
    recoveryPassEnabled: true,
    announcement: {
      title: "Public notice",
      body: "Canonical announcement",
      ctaLabel: "Read more",
      ctaUrl: "https://example.com/notice",
      publishedAt: "2026-08-15T12:00:00Z",
    },
    createdAt: "2026-08-01T12:00:00Z",
    updatedAt: "2026-08-15T12:00:00Z",
  },
  links: [{ platform: "youtube", label: "YouTube", url: "https://youtube.com/@creator", position: 1 }],
  updates: [{ id: "update-1", title: "Sent update", content: "Public content", ctaUrl: null, mediaUrl: null, sentAt: "2026-08-15T11:00:00Z" }],
  emergency: {
    title: "Recovery update",
    message: "Use the verified replacement.",
    severity: "critical",
    updatedAt: "2026-08-15T12:30:00Z",
    affected: { provider: "youtube", displayHandle: "@old", canonicalProfileUrl: "https://youtube.com/@old" },
    replacement: { provider: "youtube", displayHandle: "@new", canonicalProfileUrl: "https://youtube.com/@new", verifiedAt: "2026-08-15T12:20:00Z" },
  },
};

describe("canonical public creator page assembler", () => {
  it("maps one RPC payload into the page model", async () => {
    rpc.mockResolvedValueOnce({ data: payload, error: null }).mockResolvedValueOnce({ data: { recoveryPassName: "Creator Safety Net", displayName: "Canonical Creator", slug: "canonical-creator", tagline: "Always find me", biography: "Canonical biography" }, error: null });
    const page = await getPublicCreatorPage("canonical-creator");
    expect(rpc).toHaveBeenCalledWith("get_public_creator_page", { p_slug: "canonical-creator" });
    expect(rpc).toHaveBeenCalledWith("get_public_recovery_pass_profile", { p_slug: "canonical-creator" });
    expect(page).toMatchObject({
      bio: "Canonical biography",
      creator: {
        handle: "canonical-creator",
        displayName: "Canonical Creator",
        recoveryPassName: "Creator Safety Net",
        tagline: "Always find me",
        emergencyMode: true,
        affectedPlatform: "youtube",
        announcement: { title: "Public notice" },
      },
      updates: [{ id: "update-1", sentAt: "2026-08-15T11:00:00Z" }],
    });
    expect(page?.creator.recoveryRoutes.youtube.primary.url).toBe("https://youtube.com/@new");
  });

  it("distinguishes not found from backend failure", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: null, error: null });
    await expect(getPublicCreatorPage("missing-creator")).resolves.toBeNull();
    rpc.mockResolvedValueOnce({ data: null, error: { message: "unavailable" } }).mockResolvedValueOnce({ data: null, error: null });
    await expect(getPublicCreatorPage("broken-creator")).rejects.toBeInstanceOf(PublicCreatorPageUnavailableError);
  });

  it("keeps the normal route free of private table reads and browser creator substitution", () => {
    const route = readFileSync("app/c/[slug]/page.tsx", "utf8");
    const experience = readFileSync("components/public-creator-experience.tsx", "utf8");
    for (const privateRead of ['from("creators")', 'from("connected_accounts")', 'from("creator_updates")', 'from("creator_emergencies")']) {
      expect(route).not.toContain(privateRead);
    }
    expect(route).toContain("getPublicCreatorPage(slug)");
    expect(experience).not.toContain("readStoredCreator");
  });
});

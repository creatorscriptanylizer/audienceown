import { beforeEach, describe, expect, it, vi } from "vitest";

const cache = vi.hoisted(() => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/cache", () => cache);

import { creatorAccountsCacheTag, creatorDashboardCacheTag, revalidateCreatorAccounts } from "@/lib/social-providers/creator-account-revalidation";

describe("creator account cache invalidation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invalidates both account surfaces and their shared creator tag after OAuth writes", () => {
    revalidateCreatorAccounts("creator-a");
    expect(cache.revalidatePath.mock.calls).toEqual([
      ["/dashboard"], ["/dashboard/platforms"], ["/dashboard/settings/connected-accounts"], ["/c/[slug]", "page"],
    ]);
    expect(cache.revalidateTag.mock.calls).toEqual([
      [creatorAccountsCacheTag("creator-a"), "max"],
      [creatorDashboardCacheTag("creator-a"), "max"],
    ]);
  });

  it("invalidates dashboard aggregates after saved role changes", () => {
    revalidateCreatorAccounts("creator-a");
    expect(cache.revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(cache.revalidatePath).toHaveBeenCalledWith("/dashboard/platforms");
    expect(cache.revalidateTag).toHaveBeenCalledWith(creatorAccountsCacheTag("creator-a"), "max");
    expect(cache.revalidateTag).toHaveBeenCalledWith(creatorDashboardCacheTag("creator-a"), "max");
  });
});

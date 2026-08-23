import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";

export function creatorAccountsCacheTag(creatorId: string) {
  return `creator-accounts:${creatorId}`;
}

export function creatorDashboardCacheTag(creatorId: string) {
  return `creator-dashboard:${creatorId}`;
}

/** Keep every account-management surface consistent after an authoritative write. */
export function revalidateCreatorAccounts(creatorId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/platforms");
  revalidatePath("/dashboard/settings/connected-accounts");
  revalidatePath("/dashboard/authenticity");
  revalidatePath("/c/[slug]", "page");
  revalidatePath("/verify/[slug]", "page");
  revalidateTag(creatorAccountsCacheTag(creatorId), "max");
  revalidateTag(creatorDashboardCacheTag(creatorId), "max");
}

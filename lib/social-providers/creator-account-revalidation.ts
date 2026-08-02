import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";

export function creatorAccountsCacheTag(creatorId: string) {
  return `creator-accounts:${creatorId}`;
}

/** Keep every account-management surface consistent after an authoritative write. */
export function revalidateCreatorAccounts(creatorId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/platforms");
  revalidateTag(creatorAccountsCacheTag(creatorId), "max");
}

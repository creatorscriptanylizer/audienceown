import "server-only";

import { createClient } from "@/lib/supabase/server";

export type PublicRecoveryAccount = {
  reference: string;
  provider: string;
  label: string;
  handle: string | null;
  profileUrl: string;
  role: "main" | "recovery";
};

export type PublicRecoveryPassEnrollment = {
  accounts: PublicRecoveryAccount[];
};

function parseAccounts(value: unknown): PublicRecoveryAccount[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.reference !== "string" || typeof row.provider !== "string"
      || typeof row.label !== "string" || typeof row.profileUrl !== "string"
      || (row.role !== "main" && row.role !== "recovery")) return [];
    return [{
      reference: row.reference,
      provider: row.provider,
      label: row.label,
      handle: typeof row.handle === "string" ? row.handle : null,
      profileUrl: row.profileUrl,
      role: row.role,
    }];
  });
}

export async function getPublicRecoveryPassEnrollment(slug: string): Promise<PublicRecoveryPassEnrollment> {
  const supabase = await createClient();
  if (!supabase) return { accounts: [] };
  const { data, error } = await supabase.rpc(
    "get_public_recovery_pass_enrollment" as never,
    { p_slug: slug } as never,
  ) as unknown as { data: unknown; error: unknown };
  if (error) throw new Error("public_recovery_pass_enrollment_unavailable");
  const root = data && typeof data === "object" ? data as Record<string, unknown> : {};
  return {
    accounts: parseAccounts(root.accounts),
  };
}

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("production Recovery Pass schema", () => {
  it("grants anonymous callers only the follower-safe public RPCs", () => {
    const profile = source("supabase/migrations/20260916000000_canonical_recovery_pass_profile.sql");
    const enrollment = source("supabase/migrations/20260928000000_public_recovery_pass_enrollment.sql");
    const publicEnrollment = enrollment.slice(
      enrollment.indexOf("create or replace function public.get_public_recovery_pass_enrollment"),
      enrollment.indexOf("revoke all on function public.get_public_recovery_pass_enrollment"),
    );

    expect(profile).toContain("grant execute on function public.get_public_recovery_pass_profile(text) to anon, authenticated, service_role");
    expect(enrollment).toContain("grant execute on function public.get_public_recovery_pass_enrollment(text) to anon,authenticated");
    expect(profile).not.toContain("owner_user_id',");
    expect(publicEnrollment).not.toMatch(/oauth|token|billing|email_ciphertext/i);
  });

  it("repairs only legacy enabled passes that already have a permanent slug", () => {
    const migration = source("supabase/migrations/20260930000001_repair_published_recovery_pass_visibility.sql");

    expect(migration).toContain("set public_profile_enabled = true");
    expect(migration).toContain("where recovery_pass_enabled is true");
    expect(migration).toContain("and public_slug is not null");
    expect(migration).toContain("and public_profile_enabled is false");
  });
});

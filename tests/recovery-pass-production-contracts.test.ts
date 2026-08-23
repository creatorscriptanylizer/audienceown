import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { recoverySessionCookie, recoverySessionCookieOptions, sha256 } from "@/lib/recovery-pass-session";

const root = process.cwd();
const emailRoute = readFileSync(`${root}/app/api/public/recovery-pass/email-verification/route.ts`, "utf8");
const activationRoute = readFileSync(`${root}/app/api/public/recovery-pass/activate/route.ts`, "utf8");
const migration = readFileSync(`${root}/supabase/migrations/20260928000000_public_recovery_pass_enrollment.sql`, "utf8");
const flow = readFileSync(`${root}/components/recovery-pass-flow.tsx`, "utf8");

describe("Recovery Pass production contracts", () => {
  it("uses creator-scoped opaque management credentials", async () => {
    expect(recoverySessionCookie("nana")).toBe("ao_rp_nana");
    expect(recoverySessionCookie("another-creator")).not.toBe(recoverySessionCookie("nana"));
    expect(await sha256("opaque-token")).toMatch(/^[a-f0-9]{64}$/);
    expect(migration).toContain("creator_id=creator_row.id and preference_token_hash=p_preference_token_hash");
  });

  it("creates a host-only management cookie that reaches pages and management APIs", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(recoverySessionCookieOptions()).toMatchObject({ httpOnly: true, secure: false, sameSite: "lax", path: "/", maxAge: 365 * 24 * 60 * 60 });
    vi.stubEnv("NODE_ENV", "production");
    expect(recoverySessionCookieOptions().secure).toBe(true);
    vi.unstubAllEnvs();
  });

  it("creates hashed, expiring, single-use email OTP challenges", () => {
    expect(emailRoute).toContain("randomInt(0, 1_000_000)");
    expect(emailRoute).toContain("timingSafeEqual");
    expect(emailRoute).toContain("EMAIL_OTP_PEPPER");
    expect(emailRoute).not.toMatch(/console\.(log|info|debug).*code/);
    expect(migration).toContain("code_hash text not null");
    expect(migration).toContain("attempt_count integer not null default 0");
    expect(migration).toContain("completed_at timestamptz");
  });

  it("requires account selection and canonically verified Email before new activation", () => {
    expect(migration).toContain("at least one account is required");
    expect(migration).toContain("verified delivery method required");
    expect(migration).toContain("invalid account selection");
    expect(activationRoute).toContain("kind: \"activation_success\"");
    expect(activationRoute).toContain('.eq("method_type", "email")');
    expect(activationRoute).toContain('connection.status !== "active" && !verifiedEmail');
    expect(flow).toContain("if (!response.ok || result.status !== \"active\")");
  });

  it("loads canonical member state and preserves mandatory recovery protection", () => {
    expect(migration).toContain("get_recovery_pass_member_state");
    expect(migration).toContain("'recoveryAlerts'");
    expect(flow).toContain("Your Recovery Pass with");
    expect(flow).toContain("Recovery alerts · Required");
    expect(activationRoute).toContain("recoveryAlerts: z.literal(true)");
    expect(flow).toContain("Leave Recovery Pass");
  });

  it("does not expose raw account UUIDs in public enrollment", () => {
    expect(migration).toContain("encode(extensions.digest(a.id::text||':'||c.public_slug,'sha256'),'hex') reference");
    expect(migration).not.toContain("'reference',a.id");
  });
});

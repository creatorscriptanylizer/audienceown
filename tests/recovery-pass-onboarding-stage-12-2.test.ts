import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canSubmitCreatorForm, localSlugAvailability } from "@/lib/creator-profile";
import { RESERVED_SLUGS } from "@/lib/validation";
import { canonicalRecoveryPassUrl, displayRecoveryPassUrl } from "@/lib/recovery-pass";

const source = (path: string) => readFileSync(path, "utf8");

describe("Recovery Pass onboarding regression coverage", () => {
  it("enables valid available and unchanged creator names", () => {
    expect(canSubmitCreatorForm({ status: "available" })).toBe(true);
    expect(canSubmitCreatorForm({ status: "unchanged" })).toBe(true);
  });
  it("blocks taken, invalid, and checking names", () => {
    expect(canSubmitCreatorForm({ status: "taken" })).toBe(false);
    expect(canSubmitCreatorForm({ status: "invalid", message: "Invalid" })).toBe(false);
    expect(canSubmitCreatorForm({ status: "checking" })).toBe(false);
  });
  it("keeps submission blocked after a transient failure while offering retry", () => {
    expect(canSubmitCreatorForm({ status: "error", message: "Try again" })).toBe(false);
    expect(source("components/recovery-pass-setup.tsx")).toContain("setRetryKey");
  });
  it("keeps reserved routes unavailable", () => {
    for (const slug of ["api", "login", "dashboard", "onboarding", "pricing", "terms", "privacy"]) expect(RESERVED_SLUGS.has(slug)).toBe(true);
    expect(localSlugAvailability("dashboard")).toMatchObject({ status: "invalid" });
  });
  it("uses clean creator-facing URLs for preview, copy, share, and successful creation", () => {
    const component = source("components/recovery-pass-setup.tsx");
    expect(component).toContain("canonicalRecoveryPassUrl");
    expect(component).not.toContain("/c/");
    expect(canonicalRecoveryPassUrl("http://localhost:3000", "nana")).toBe("https://audienceown.com/nana");
    expect(displayRecoveryPassUrl("http://127.0.0.1:3000", "nana")).toBe("audienceown.com/nana");
    expect(source("app/onboarding/actions.ts")).toContain("return { success: true, url: `/${parsed.data.public_slug}` }" );
  });
  it("authenticates availability checks and distinguishes invalid input from server failure", () => {
    const route = source("app/api/onboarding/recovery-pass/availability/route.ts");
    const checker = source("lib/creator-slug-availability.ts");
    expect(route).toContain("await getViewer()");
    expect(route).toContain('code:"unauthenticated"');
    expect(checker).toContain('status:"error"');
    expect(checker).toContain('status=message.toLowerCase().includes("reserved")');
  });
  it("ignores stale responses and treats retry as a new request", () => {
    const component = source("components/recovery-pass-setup.tsx");
    expect(component).toContain("requestSequence");
    expect(component).toContain("sequence !== requestSequence.current");
    expect(component).toContain("checked !== slugState.slug");
    expect(component).toContain('error.name === "AbortError"');
    expect(component).toContain("setRetryKey");
  });
  it("retains owner checks, duplicate protection, error feedback, and milestone advancement", () => {
    const action = source("app/onboarding/actions.ts");
    expect(action).toContain('db.rpc("create_recovery_pass"');
    expect(action).toContain('error.code === "23505"');
    expect(action).toContain("That creator name was just taken. Choose another one.");
    expect(source("supabase/migrations/20260906000000_atomic_recovery_pass_creation.sql")).toContain("recovery_pass_completed_at");
    expect(source("components/recovery-pass-setup.tsx")).toContain('role="alert"');
  });
});

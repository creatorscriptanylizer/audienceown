import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const recovery = readFileSync("components/confirmation-recovery.tsx", "utf8");
const authForm = readFileSync("components/auth-form.tsx", "utf8");
const actions = readFileSync("app/(auth)/actions.ts", "utf8");
const confirmationPage = readFileSync("app/(auth)/confirmation/page.tsx", "utf8");

describe("email confirmation recovery UX", () => {
  it("gives inactive links neutral sign-in and resend actions", () => {
    expect(recovery).toContain("This Confirmation Link Is No Longer Active");
    expect(recovery).toContain("Sign in to AudienceOwn");
    expect(recovery).toContain("Send a New Confirmation Email");
    expect(recovery).not.toContain("email is already confirmed");
  });

  it("only claims confirmation when the server-selected confirmed state is present", () => {
    expect(recovery).toContain("Your Email Is Already Confirmed");
    expect(recovery).toContain("confirmed ?");
    expect(confirmationPage).toContain("auth.getUser()");
    expect(confirmationPage).toContain("email_confirmed_at");
    expect(confirmationPage).not.toContain("already_confirmed");
  });

  it("uses resend rather than another signup and preserves the internal continuation", () => {
    expect(actions).toContain("supabase.auth.resend");
    expect(actions).toContain('type: "signup"');
    expect(authForm).toContain("resendSignupConfirmation(data)");
    expect(authForm).not.toContain("signUp({}, data)");
  });
});

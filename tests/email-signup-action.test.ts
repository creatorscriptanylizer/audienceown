import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn(),
  info: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/app-url", () => ({
  appUrl: (path = "") => `https://audienceown.com${path}`,
  authApplicationOrigin: vi.fn(),
  PRODUCTION_APP_ORIGIN: "https://audienceown.com",
}));
vi.mock("@/lib/debug", () => ({ debugError: vi.fn(), debugLog: vi.fn() }));

import { resendSignupConfirmation, signUp } from "@/app/(auth)/actions";
import { emailAuthErrorState } from "@/lib/email-auth-state";

function form(email = "creator@yahoo.com", password = "strong-password", next = "/onboarding") {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  data.set("next", next);
  return data;
}

function authResult(result: { user?: object | null; session?: object | null; error?: { name?: string; code?: string; status?: number; message?: string } | null }, resendError: { code?: string; status?: number; message?: string } | null = null) {
  const signUp = vi.fn().mockResolvedValue({
    data: { user: result.user ?? null, session: result.session ?? null },
    error: result.error ?? null,
  });
  const resend = vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: resendError });
  mocks.createClient.mockResolvedValue({ auth: { signUp, resend } });
  return { signUp, resend };
}

describe("email signup server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project-ref.supabase.co");
    vi.spyOn(console, "info").mockImplementation(mocks.info);
  });

  it("sends a valid new account to Supabase Auth", async () => {
    const { signUp: call } = authResult({ user: { id: "user-1", identities: [{ id: "identity-1" }] } });
    await signUp({}, form());
    expect(call).toHaveBeenCalledOnce();
    expect(call).toHaveBeenCalledWith(expect.objectContaining({ email: "creator@yahoo.com", password: "strong-password" }));
  });

  it("returns confirmation-required only after Supabase creates an unconfirmed user", async () => {
    authResult({ user: { id: "user-1", identities: [{ id: "identity-1" }] }, session: null });
    await expect(signUp({}, form())).resolves.toEqual({
      kind: "confirmation_required",
      title: "Check Your Inbox",
      message: "We sent a confirmation link to the email address you provided. Open it to confirm your email and continue to AudienceOwn.",
      email: "creator@yahoo.com",
      next: "/onboarding",
    });
    expect(mocks.info).toHaveBeenLastCalledWith("[AUDIENCEOWN AUTH DEBUG]", expect.objectContaining({ event: "email_signup_result", userCreated: true, sessionCreated: false, confirmationRequired: true }));
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid email", form("not-an-email")],
    ["weak password", form("creator@yahoo.com", "short")],
  ])("rejects %s before Supabase Auth", async (_label, data) => {
    const { signUp: call } = authResult({ user: { id: "should-not-exist" } });
    await expect(signUp({}, data)).resolves.toEqual({ error: "Enter a valid email and a password of at least 8 characters." });
    expect(call).not.toHaveBeenCalled();
  });

  it("maps an existing-account response without exposing provider internals", async () => {
    authResult({ error: { name: "AuthApiError", code: "user_already_exists", status: 422, message: "User already registered" } });
    await expect(signUp({}, form())).resolves.toMatchObject({ kind: "repeated_signup", title: "Continue With Your Account" });
  });

  it("maps unexpected Supabase errors safely while preserving diagnostics server-side", async () => {
    authResult({ error: { name: "AuthApiError", code: "unexpected_failure", status: 503, message: "Failure for creator@yahoo.com" } });
    const result = await signUp({}, form());
    expect(result.error).not.toContain("unexpected_failure");
    expect(mocks.info).toHaveBeenLastCalledWith("[AUDIENCEOWN AUTH DEBUG]", expect.objectContaining({ errorCode: "unexpected_failure", httpStatus: 503, safeErrorMessage: "Failure for [REDACTED_EMAIL]" }));
  });

  it("preserves Pro intent through the confirmation callback", async () => {
    const { signUp: call } = authResult({ user: { id: "user-1", identities: [{ id: "identity-1" }] } });
    await signUp({}, form("creator@yahoo.com", "strong-password", "/auth/continue?intent=pro&interval=yearly"));
    expect(call).toHaveBeenCalledWith(expect.objectContaining({ options: { emailRedirectTo: expect.stringContaining("next=/auth/continue%3Fintent%3Dpro%26interval%3Dyearly") } }));
  });

  it("never logs the full email, password, project key, or a fake session", async () => {
    authResult({ user: { id: "user-1", identities: [{ id: "identity-1" }] }, session: null });
    await signUp({}, form());
    const emitted = JSON.stringify(mocks.info.mock.calls);
    expect(emitted).not.toContain("creator@yahoo.com");
    expect(emitted).not.toContain("strong-password");
    expect(emitted).not.toMatch(/publishable|service_role|anon_key/i);
    expect(emitted).toContain('"sessionCreated":false');
  });

  it("maps Supabase email throttling to confirmation-specific guidance", () => {
    expect(emailAuthErrorState({ status: 429, message: "email rate limit exceeded" })).toEqual({
      kind: "rate_limited",
      title: "Too Many Confirmation Requests",
      error: "Please wait a few minutes before requesting another confirmation email.",
    });
  });

  it("treats Supabase's obfuscated existing-user response as a neutral repeated signup", async () => {
    authResult({ user: { id: "obfuscated-user", identities: [] }, session: null });
    const result = await signUp({}, form());
    expect(result).toMatchObject({ kind: "repeated_signup", title: "Continue With Your Account", email: "creator@yahoo.com", next: "/onboarding" });
    expect(result.message).not.toMatch(/sent a confirmation/i);
    expect(result).not.toHaveProperty("error");
  });

  it("resends signup confirmation with the preserved safe Pro intent", async () => {
    const { resend } = authResult({});
    const result = await resendSignupConfirmation(form("creator@yahoo.com", "unused-password", "/auth/continue?intent=pro&interval=monthly"));
    expect(result).toMatchObject({ kind: "resent", title: "Confirmation Email Sent", message: "We’ve sent a new confirmation link. Use the newest email to continue." });
    expect(resend).toHaveBeenCalledWith({
      type: "signup",
      email: "creator@yahoo.com",
      options: { emailRedirectTo: expect.stringContaining("next=/auth/continue%3Fintent%3Dpro%26interval%3Dmonthly") },
    });
  });

  it("does not claim resend success when Supabase rejects the request", async () => {
    authResult({}, { status: 429, message: "email rate limit exceeded" });
    const result = await resendSignupConfirmation(form());
    expect(result).toMatchObject({ kind: "rate_limited", title: "Too Many Confirmation Requests" });
    expect(result.kind).not.toBe("resent");
  });
});

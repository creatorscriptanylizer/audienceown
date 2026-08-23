import type { AuthState } from "@/app/(auth)/actions";

type SafeAuthError = { code?: string; status?: number; message?: string } | null;

export function emailAuthErrorState(error: SafeAuthError): AuthState {
  const normalized = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  if (error?.status === 429 || normalized.includes("email rate limit exceeded") || normalized.includes("over_email_send_rate_limit")) {
    return {
      kind: "rate_limited",
      title: "Too Many Confirmation Requests",
      error: "Please wait a few minutes before requesting another confirmation email.",
    };
  }
  if (error?.code === "user_already_exists" || normalized.includes("user already registered")) {
    return {
      kind: "repeated_signup",
      title: "Continue With Your Account",
      message: "If you’ve already created an AudienceOwn account, sign in to continue. If you still need to confirm your email, you can request a new confirmation message.",
    };
  }
  return { error: "We couldn’t create that account. Check your details or try again." };
}

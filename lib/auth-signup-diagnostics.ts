import "server-only";

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

export function supabaseProjectHost() {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
      : "unconfigured";
  } catch {
    return "invalid";
  }
}

export function safeAuthErrorMessage(value: unknown) {
  if (typeof value !== "string") return null;
  return value.replace(EMAIL, "[REDACTED_EMAIL]").slice(0, 500);
}

export function logEmailSignup(event: "email_signup_attempt" | "email_signup_result", metadata: Record<string, unknown>) {
  console.info("[AUDIENCEOWN AUTH DEBUG]", { event, ...metadata });
}

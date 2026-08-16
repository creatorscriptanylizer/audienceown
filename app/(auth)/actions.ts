"use server";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/app-url";
import { localGoogleConfigured, mapOAuthError, safeNextPath } from "@/lib/auth-flow";
import { debugError, debugLog } from "@/lib/debug";

const credentials = z.object({ email: z.string().email(), password: z.string().min(8).max(128) });
export type AuthState = { error?: string; message?: string };

async function authInitiationContext() {
  try {
    const [store, requestHeaders] = await Promise.all([cookies(), headers()]);
    const canonical = new URL(appUrl());
    return {
      callbackHost: canonical.host,
      forwardedHostPresent: Boolean(requestHeaders.get("x-forwarded-host")),
      forwardedProtoPresent: Boolean(requestHeaders.get("x-forwarded-proto")),
      forwardedHostMatchesCanonical: requestHeaders.get("x-forwarded-host")?.split(",", 1)[0]?.trim() === canonical.host,
      forwardedProtoHttps: requestHeaders.get("x-forwarded-proto")?.split(",", 1)[0]?.trim() === "https",
      pkceContextPresent: store.getAll().some(({ name }) => name.includes("-code-verifier")),
    };
  } catch {
    return { callbackHost: new URL(appUrl()).host, forwardedHostPresent: false, forwardedProtoPresent: false, forwardedHostMatchesCanonical: false, forwardedProtoHttps: false, pkceContextPresent: false };
  }
}

export async function signInWithGoogle(data: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=configuration");
  const next = safeNextPath(typeof data.get("next") === "string" ? String(data.get("next")) : null, "/onboarding");
  if (process.env.NODE_ENV === "development" && !localGoogleConfigured()) redirect(`/login?next=${encodeURIComponent(next)}&error=google_not_configured`);
  const redirectTo = appUrl(`/auth/callback?next=${encodeURIComponent(next).replaceAll("%2F", "/")}`);
  debugLog("oauth", { event: "auth_initiation", provider: "google", redirectOrigin: new URL(redirectTo).origin, redirectPath: new URL(redirectTo).pathname });
  const { data: oauth, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error || !oauth.url) {
    debugError("oauth", error ?? new Error("OAuth authorization URL was not returned."), { event: "auth_initiation_failed", provider: "google" });
    redirect(`/login?next=${encodeURIComponent(next)}&error=${mapOAuthError(error)}`);
  }
  debugLog("oauth", { event: "auth_initiation_ready", provider: "google", ...await authInitiationContext() });
  redirect(oauth.url);
}

export async function signUp(_: AuthState, data: FormData): Promise<AuthState> {
  const input = credentials.safeParse(Object.fromEntries(data));
  if (!input.success) return { error: "Enter a valid email and a password of at least 8 characters." };
  const supabase = await createClient();
  if (!supabase) return { error: "Authentication is not configured yet." };
  const { error } = await supabase.auth.signUp({ ...input.data, options: { emailRedirectTo: appUrl("/auth/callback?next=/onboarding") } });
  if (error) return { error: "We couldn’t create that account. Check your details or try again." };
  return { message: "Check your inbox to confirm your email, then continue to AudienceOwn." };
}

export async function login(_: AuthState, data: FormData): Promise<AuthState> {
  const input = credentials.safeParse(Object.fromEntries(data));
  if (!input.success) return { error: "Enter a valid email and password." };
  const supabase = await createClient();
  if (!supabase) return { error: "Authentication is not configured yet." };
  const { error } = await supabase.auth.signInWithPassword(input.data);
  if (error) return { error: "Email or password is incorrect, or the email is not confirmed." };
  redirect(safeNextPath(typeof data.get("next") === "string" ? String(data.get("next")) : null, "/dashboard"));
}

export async function forgotPassword(_: AuthState, data: FormData): Promise<AuthState> {
  const email = z.string().email().safeParse(data.get("email"));
  if (!email.success) return { error: "Enter a valid email address." };
  const supabase = await createClient();
  if (supabase) await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: appUrl("/auth/callback?next=/reset-password") });
  return { message: "If an account exists for that address, a reset link is on its way." };
}

export async function updatePassword(_: AuthState, data: FormData): Promise<AuthState> {
  const password = z.string().min(8).max(128).safeParse(data.get("password"));
  if (!password.success) return { error: "Use at least 8 characters." };
  const supabase = await createClient();
  if (!supabase) return { error: "Authentication is not configured yet." };
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: "That password could not be updated. Request a new reset link." };
  return { message: "Password updated. You can now continue to your dashboard." };
}

export async function logout() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/");
}

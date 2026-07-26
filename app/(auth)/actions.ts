"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/utils";

const credentials = z.object({ email: z.string().email(), password: z.string().min(8).max(128) });
export type AuthState = { error?: string; message?: string };

function safeNextPath(value: FormDataEntryValue | null, fallback: string) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export async function signInWithGoogle(data: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=configuration");
  const next = safeNextPath(data.get("next"), "/onboarding");
  const { data: oauth, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: appUrl(`/auth/callback?next=${encodeURIComponent(next)}`) },
  });
  if (error || !oauth.url) redirect("/login?error=oauth");
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
  redirect("/dashboard");
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

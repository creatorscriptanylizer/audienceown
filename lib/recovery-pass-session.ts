import "server-only";

import { cookies } from "next/headers";

export const RECOVERY_SESSION_MAX_AGE = 365 * 24 * 60 * 60;

export function recoverySessionCookie(slug: string) {
  return `ao_rp_${slug}`;
}

export function recoverySessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: RECOVERY_SESSION_MAX_AGE,
    priority: "high" as const,
  };
}

export async function sha256(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function readRecoverySession(slug: string) {
  return (await cookies()).get(recoverySessionCookie(slug))?.value ?? null;
}

export async function setRecoverySession(slug: string, token: string) {
  (await cookies()).set(recoverySessionCookie(slug), token, recoverySessionCookieOptions());
}

export async function clearRecoverySession(slug: string) {
  (await cookies()).delete(recoverySessionCookie(slug));
}

import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export function publicEnv() {
  const parsed = publicSchema.safeParse(process.env);
  if (!parsed.success) return null;
  return parsed.data;
}

export function integrationStatus() {
  return {
    supabase: Boolean(publicEnv()),
    turnstile: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY),
    resend: Boolean(
      process.env.RESEND_API_KEY
      && (process.env.DELIVERY_EMAIL_FROM || process.env.RESEND_FROM_EMAIL),
    ),
  };
}

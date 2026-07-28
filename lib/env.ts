import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const vapidSchema = z.object({
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(80),
  VAPID_PRIVATE_KEY: z.string().min(20),
  VAPID_SUBJECT: z.string().refine((value) =>
    value.startsWith("mailto:") || value.startsWith("https:")),
});

const twilioSchema = z.object({
  TWILIO_ACCOUNT_SID: z.string().regex(/^AC[a-fA-F0-9]{32}$/),
  TWILIO_AUTH_TOKEN: z.string().min(20),
  TWILIO_MESSAGING_SERVICE_SID: z.string().regex(/^MG[a-fA-F0-9]{32}$/),
  TWILIO_VERIFY_SERVICE_SID: z.string().regex(/^VA[a-fA-F0-9]{32}$/),
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
    resendWebhooks: Boolean(process.env.RESEND_WEBHOOK_SECRET),
    browserPush: vapidSchema.safeParse(process.env).success
      && Boolean(process.env.CONTACT_ENCRYPTION_KEY),
    sms: twilioSchema.safeParse(process.env).success
      && Boolean(process.env.CONTACT_ENCRYPTION_KEY),
  };
}

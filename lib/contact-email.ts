import "server-only";
import { Resend } from "resend";
import type { ContactEmailSender } from "@/lib/contact-form";
import { CONTACT_EMAIL_FROM } from "@/lib/contact-form-contract";

export const CONTACT_EMAIL_TIMEOUT_MS = 10_000;

export function configuredContactEmail(): { sender: ContactEmailSender | null; from: string | null } {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DELIVERY_EMAIL_FROM ?? process.env.RESEND_FROM_EMAIL ?? null;
  if (!apiKey || from !== CONTACT_EMAIL_FROM) return { sender: null, from: null };
  const resend = new Resend(apiKey);
  return { from, sender: async input => {
    const requestOptions = { signal: AbortSignal.timeout(CONTACT_EMAIL_TIMEOUT_MS) };
    const { data, error } = await resend.emails.send(input, requestOptions as never);
    return data?.id ? { id: data.id } : { error };
  } };
}

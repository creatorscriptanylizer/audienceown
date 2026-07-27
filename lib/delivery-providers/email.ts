import "server-only";

import { Resend } from "resend";
import { createEmailProvider } from "@/lib/delivery-providers/email-provider";

export function createConfiguredEmailProvider() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DELIVERY_EMAIL_FROM ?? process.env.RESEND_FROM_EMAIL ?? null;
  if (!apiKey) return createEmailProvider(null, from);

  const resend = new Resend(apiKey);
  return createEmailProvider(async (input) => {
    const { data, error } = await resend.emails.send(input);
    return data?.id
      ? { id: data.id }
      : { error: {
        name: error?.name,
        message: error?.message,
        statusCode: "statusCode" in (error ?? {}) ? Number(error?.statusCode) : undefined,
      } };
  }, from);
}

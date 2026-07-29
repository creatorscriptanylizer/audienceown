import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import {
  canonicalAppUrl,
  type ReadinessState,
} from "@/lib/sms-readiness";

export type WhatsAppReadiness = {
  outbound: ReadinessState;
  otp: ReadinessState;
  webhook: ReadinessState;
};

const accountSidPattern = /^AC[a-fA-F0-9]{32}$/;
const verifySidPattern = /^VA[a-fA-F0-9]{32}$/;
const contentSidPattern = /^HX[a-fA-F0-9]{32}$/;

function tokenValid(value: string | undefined) {
  return Boolean(value && value.length >= 20
    && !/^(placeholder|changeme|example|test|your[-_])/i.test(value));
}

export function canonicalWhatsAppSender(value: string | undefined) {
  if (!value?.startsWith("whatsapp:")) return null;
  const phone = parsePhoneNumberFromString(value.slice("whatsapp:".length));
  return phone?.isValid() && phone.number === value.slice("whatsapp:".length)
    ? value
    : null;
}

function credentialsState(
  environment: NodeJS.ProcessEnv,
  fields: Array<string | undefined>,
  valid: boolean,
): ReadinessState {
  if (fields.some((value) => !value)) return "missing_configuration";
  return valid ? "configured" : "invalid_configuration";
}

export function whatsappReadiness(
  environment: NodeJS.ProcessEnv = process.env,
  production = environment.NODE_ENV === "production",
): WhatsAppReadiness {
  const account = environment.TWILIO_ACCOUNT_SID;
  const token = environment.TWILIO_AUTH_TOKEN;
  const verify = environment.TWILIO_VERIFY_SERVICE_SID;
  const sender = environment.TWILIO_WHATSAPP_SENDER;
  const contentSid = environment.TWILIO_WHATSAPP_RECOVERY_CONTENT_SID;
  const appUrl = canonicalAppUrl(environment, production);
  const outbound = credentialsState(
    environment,
    [account, token, sender, contentSid],
    accountSidPattern.test(account ?? "")
      && tokenValid(token)
      && Boolean(canonicalWhatsAppSender(sender))
      && contentSidPattern.test(contentSid ?? "")
      && Boolean(appUrl),
  );
  const otp = credentialsState(
    environment,
    [account, token, verify, environment.CONTACT_ENCRYPTION_KEY],
    accountSidPattern.test(account ?? "")
      && tokenValid(token)
      && verifySidPattern.test(verify ?? "")
      && (environment.CONTACT_ENCRYPTION_KEY?.length ?? 0) >= 20,
  );
  const webhook = credentialsState(
    environment,
    [token],
    tokenValid(token) && Boolean(appUrl),
  );
  return { outbound, otp, webhook };
}

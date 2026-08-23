export type ReadinessState =
  | "configured"
  | "missing_configuration"
  | "invalid_configuration";

export type SmsReadiness = {
  outbound: ReadinessState;
  otp: ReadinessState;
  webhook: ReadinessState;
};

export type SmsReadinessDiagnostic = {
  accountSidConfigured: boolean;
  authTokenConfigured: boolean;
  verifyServiceConfigured: boolean;
  messagingServiceConfigured: boolean;
  otpReady: boolean;
  outboundReady: boolean;
  smsAvailable: boolean;
  reason: string | null;
};

const accountSidPattern = /^AC[a-fA-F0-9]{32}$/;
const messagingSidPattern = /^MG[a-fA-F0-9]{32}$/;
const verifySidPattern = /^VA[a-fA-F0-9]{32}$/;

function canonicalUrlState(value: string | undefined, production: boolean): ReadinessState {
  if (!value) return "missing_configuration";
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash
      || (url.pathname !== "/" && url.pathname !== "")
      || (production && (url.protocol !== "https:"
        || ["localhost", "127.0.0.1", "::1"].includes(url.hostname)))) {
      return "invalid_configuration";
    }
    if (!["http:", "https:"].includes(url.protocol)) return "invalid_configuration";
    return "configured";
  } catch {
    return "invalid_configuration";
  }
}

function credentialState(
  values: Array<string | undefined>,
  validators: Array<(value: string) => boolean>,
): ReadinessState {
  if (values.some((value) => !value)) return "missing_configuration";
  return values.every((value, index) => validators[index](value!))
    ? "configured"
    : "invalid_configuration";
}

export function smsReadiness(
  environment: NodeJS.ProcessEnv = process.env,
  production = environment.NODE_ENV === "production",
): SmsReadiness {
  const account = environment.TWILIO_ACCOUNT_SID;
  const token = environment.TWILIO_AUTH_TOKEN;
  const messaging = environment.TWILIO_MESSAGING_SERVICE_SID;
  const verify = environment.TWILIO_VERIFY_SERVICE_SID;
  const appUrl = canonicalUrlState(environment.NEXT_PUBLIC_APP_URL, production);
  const tokenValid = (value: string) =>
    value.length >= 20 && !/^(placeholder|changeme|example|test|your[-_])/i.test(value);

  const outboundCredentials = credentialState(
    [account, token, messaging],
    [
      (value) => accountSidPattern.test(value),
      tokenValid,
      (value) => messagingSidPattern.test(value),
    ],
  );
  const otpCredentials = credentialState(
    [account, token, verify, environment.CONTACT_ENCRYPTION_KEY],
    [
      (value) => accountSidPattern.test(value),
      tokenValid,
      (value) => verifySidPattern.test(value),
      (value) => value.length >= 20,
    ],
  );
  const webhookCredentials = credentialState(
    [token],
    [tokenValid],
  );

  return {
    outbound: outboundCredentials === "configured" ? appUrl : outboundCredentials,
    otp: otpCredentials,
    webhook: webhookCredentials === "configured" ? appUrl : webhookCredentials,
  };
}

export function smsReadinessDiagnostic(
  environment: NodeJS.ProcessEnv = process.env,
  production = environment.NODE_ENV === "production",
): SmsReadinessDiagnostic {
  const readiness = smsReadiness(environment, production);
  const required = [
    ["TWILIO_ACCOUNT_SID", environment.TWILIO_ACCOUNT_SID],
    ["TWILIO_AUTH_TOKEN", environment.TWILIO_AUTH_TOKEN],
    ["TWILIO_VERIFY_SERVICE_SID", environment.TWILIO_VERIFY_SERVICE_SID],
    ["TWILIO_MESSAGING_SERVICE_SID", environment.TWILIO_MESSAGING_SERVICE_SID],
  ] as const;
  const missing = required.filter(([, value]) => !value).map(([name]) => name);
  const invalid = [
    environment.TWILIO_ACCOUNT_SID && !accountSidPattern.test(environment.TWILIO_ACCOUNT_SID) ? "TWILIO_ACCOUNT_SID" : null,
    environment.TWILIO_AUTH_TOKEN && (environment.TWILIO_AUTH_TOKEN.length < 20 || /^(placeholder|changeme|example|test|your[-_])/i.test(environment.TWILIO_AUTH_TOKEN)) ? "TWILIO_AUTH_TOKEN" : null,
    environment.TWILIO_VERIFY_SERVICE_SID && !verifySidPattern.test(environment.TWILIO_VERIFY_SERVICE_SID) ? "TWILIO_VERIFY_SERVICE_SID" : null,
    environment.TWILIO_MESSAGING_SERVICE_SID && !messagingSidPattern.test(environment.TWILIO_MESSAGING_SERVICE_SID) ? "TWILIO_MESSAGING_SERVICE_SID" : null,
  ].filter((name): name is string => Boolean(name));
  const reason = missing.length
    ? `missing_configuration: ${missing.join(", ")}`
    : invalid.length
      ? `invalid_configuration: ${invalid.join(", ")}`
      : readiness.otp !== "configured" || readiness.outbound !== "configured"
        ? "invalid_configuration: CONTACT_ENCRYPTION_KEY or NEXT_PUBLIC_APP_URL"
        : null;
  return {
    accountSidConfigured: Boolean(environment.TWILIO_ACCOUNT_SID),
    authTokenConfigured: Boolean(environment.TWILIO_AUTH_TOKEN),
    verifyServiceConfigured: Boolean(environment.TWILIO_VERIFY_SERVICE_SID),
    messagingServiceConfigured: Boolean(environment.TWILIO_MESSAGING_SERVICE_SID),
    otpReady: readiness.otp === "configured",
    outboundReady: readiness.outbound === "configured",
    smsAvailable: readiness.otp === "configured" && readiness.outbound === "configured",
    reason,
  };
}

const readinessLogKey = Symbol.for("audienceown.sms.readiness");
export function reportSmsReadiness(environment: NodeJS.ProcessEnv = process.env) {
  const shared = globalThis as unknown as Record<PropertyKey, unknown>;
  if (!(["1", "true"].includes(environment.AUDIENCEOWN_DEBUG ?? "")) || shared[readinessLogKey]) return;
  shared[readinessLogKey] = true;
  console.info("[AUDIENCEOWN SMS READINESS]", smsReadinessDiagnostic(environment));
}

export function canonicalAppUrl(
  environment: NodeJS.ProcessEnv = process.env,
  production = environment.NODE_ENV === "production",
) {
  if (canonicalUrlState(environment.NEXT_PUBLIC_APP_URL, production) !== "configured") {
    return null;
  }
  return new URL(environment.NEXT_PUBLIC_APP_URL!).origin;
}

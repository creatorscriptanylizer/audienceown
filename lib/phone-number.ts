import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/max";

export type PhoneNormalizationResult =
  | { ok: true; e164: string; masked: string; country: CountryCode }
  | { ok: false; code: "invalid_phone" | "country_required" };

export function normalizePhoneNumber(
  input: string,
  country?: string | null,
): PhoneNormalizationResult {
  const value = input.trim().normalize("NFKC");
  if (!value.startsWith("+") && !country) return { ok: false, code: "country_required" };
  const normalizedCountry = country?.trim().toUpperCase() as CountryCode | undefined;
  let parsed;
  try {
    parsed = parsePhoneNumberFromString(value, normalizedCountry);
  } catch {
    return { ok: false, code: "invalid_phone" };
  }
  if (!parsed?.isPossible() || !parsed.isValid()) return { ok: false, code: "invalid_phone" };
  return {
    ok: true,
    e164: parsed.number,
    masked: `•••• •••• ${parsed.number.slice(-4)}`,
    country: parsed.country ?? normalizedCountry!,
  };
}

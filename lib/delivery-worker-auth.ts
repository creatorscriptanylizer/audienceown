import { timingSafeEqual } from "node:crypto";

export function isDeliveryWorkerAuthorized(
  authorization: string | null,
  configuredSecret: string | undefined,
) {
  if (!configuredSecret || !authorization?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(configuredSecret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

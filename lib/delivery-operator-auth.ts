import "server-only";
import { createClient } from "@/lib/supabase/server";
import { canonicalAppUrl } from "@/lib/sms-readiness";

export type DeliveryOperator = {
  userId: string;
  role: "delivery_operator" | "delivery_admin";
};

function configuredIds(value: string | undefined) {
  return new Set((value ?? "").split(",").map((entry) => entry.trim()).filter(Boolean));
}

export async function getDeliveryOperator(): Promise<DeliveryOperator | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error("delivery_operator_auth_unavailable", { cause: error });
  const userId = data.user?.id;
  if (!userId) return null;
  if (configuredIds(process.env.DELIVERY_ADMIN_USER_IDS).has(userId)) {
    return { userId, role: "delivery_admin" };
  }
  if (configuredIds(process.env.DELIVERY_OPERATOR_USER_IDS).has(userId)) {
    return { userId, role: "delivery_operator" };
  }
  return null;
}

export function isMutationOriginAllowed(request: Request) {
  const origin = request.headers.get("origin");
  const appUrl = canonicalAppUrl();
  return Boolean(origin && appUrl && origin === appUrl);
}

const mutationWindows = new Map<string, number[]>();
export function takeOperatorMutationRateLimit(userId: string, now = Date.now()) {
  const cutoff = now - 60_000;
  const recent = (mutationWindows.get(userId) ?? []).filter((value) => value > cutoff);
  if (recent.length >= 10) return false;
  recent.push(now);
  mutationWindows.set(userId, recent);
  return true;
}

import { safeNextPath } from "@/lib/auth-flow";

export type ProInterval = "monthly" | "yearly";

export function safeProInterval(value: string | null | undefined): ProInterval | null {
  return value === "monthly" || value === "yearly" ? value : null;
}

export function proAuthContinuation(interval: ProInterval) {
  return `/auth/continue?intent=pro&interval=${interval}`;
}

export function unifiedAuthNext(params: { intent?: string; interval?: string; next?: string }) {
  const interval = params.intent === "pro" ? safeProInterval(params.interval) : null;
  return interval ? proAuthContinuation(interval) : safeNextPath(params.next, "/onboarding");
}

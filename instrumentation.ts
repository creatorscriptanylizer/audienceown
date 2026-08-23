import { assertProductionRuntimeSafety } from "@/lib/production-runtime-safety";

const startupKey = Symbol.for("audienceown.production-runtime-safety");

export function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const shared = globalThis as Record<PropertyKey, unknown>;
  if (shared[startupKey]) return;
  const state = assertProductionRuntimeSafety();
  shared[startupKey] = true;
  if (state.environment === "production") console.info("[AUDIENCEOWN STARTUP]", state);
}

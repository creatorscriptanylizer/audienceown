import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { publicEnv } from "@/lib/env";

export async function createClient() {
  const env = publicEnv();
  if (!env) return null;
  const store = await cookies();
  const secure = (() => {
    try { return new URL(process.env.APP_URL ?? "http://localhost:3000").protocol === "https:"; }
    catch { return process.env.NODE_ENV === "production"; }
  })();
  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: { path: "/", sameSite: "lax", secure },
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; proxy performs refresh.
        }
      },
    },
  });
}

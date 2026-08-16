import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const getViewer = cache(async () => {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error("viewer_lookup_unavailable", { cause: error });
  return data.user;
});

export async function requireViewer() {
  const user = await getViewer();
  if (!user) redirect("/login?next=/dashboard");
  return user;
}

export const getCreator = cache(async () => {
  const user = await getViewer();
  const supabase = await createClient();
  if (!user || !supabase) return null;
  const { data, error } = await supabase.from("creators").select("*").eq("owner_user_id", user.id).maybeSingle();
  if (error) throw new Error("creator_lookup_unavailable", { cause: error });
  return data;
});

export async function getCreatorState() {
  const user = await getViewer();
  if (!user) return { status: "unauthenticated" as const };
  const supabase = await createClient();
  if (!supabase) return { status: "unavailable" as const };
  const { data, error } = await supabase.from("creators").select("*").eq("owner_user_id", user.id).maybeSingle();
  if (error) return { status: "unavailable" as const };
  return data ? { status: "available" as const, creator: data } : { status: "absent" as const };
}

export async function requireCreator() {
  await requireViewer();
  const creator = await getCreator();
  if (!creator) redirect("/onboarding");
  return creator;
}

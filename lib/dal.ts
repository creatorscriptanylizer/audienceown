import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const getViewer = cache(async () => {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
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
  const { data } = await supabase.from("creators").select("*").eq("owner_user_id", user.id).maybeSingle();
  return data;
});

export async function requireCreator() {
  await requireViewer();
  const creator = await getCreator();
  if (!creator) redirect("/onboarding");
  return creator;
}

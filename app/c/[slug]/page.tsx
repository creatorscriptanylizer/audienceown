import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicCreatorExperience } from "@/components/public-creator-experience";
import { getDemoCreator } from "@/lib/public-creators";
import { getCreator, getViewer } from "@/lib/dal";
import { canAccessRecoveryDeveloperTools } from "@/lib/recovery-access";
import { createClient } from "@/lib/supabase/server";
import type { CreatorRecord } from "@/lib/public-creators";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ src?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const creator = getDemoCreator(slug);
  if (!creator) return { title: "Creator not found", robots: { index: false } };
  return {
    title: `${creator.displayName} — Recovery Pass`,
    description: `The verified AudienceOwn recovery page for ${creator.displayName}.`,
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const { src } = await searchParams;
  const supabase = await createClient();
  const [{ data: profile }, { data: links }, { data: databaseCreator }] = supabase ? await Promise.all([
    supabase.from("public_creator_profiles").select("*").eq("public_slug", slug).maybeSingle(),
    supabase.from("public_connected_accounts").select("*").eq("public_slug", slug).order("position"),
    supabase.from("creators").select("id,owner_user_id").eq("public_slug", slug).eq("public_profile_enabled", true).maybeSingle(),
  ]) : [{ data: null }, { data: [] }, { data: null }];
  const demo = getDemoCreator(slug);
  const creator: CreatorRecord | null = demo ?? (profile && profile.display_name && profile.public_slug ? {
    handle: profile.public_slug,
    displayName: profile.display_name,
    avatar: profile.profile_image_path ?? undefined,
    verified: true,
    recoveryPassPublished: profile.recovery_pass_enabled ?? true,
    emergencyMode: false,
    lastVerifiedAt: profile.updated_at ?? new Date().toISOString(),
    recoveryCoreFans: 0,
    officialLinks: (links ?? []).map((link, index) => ({
      id: `${link.platform ?? "website"}-${index}`, platform: link.platform ?? "Website",
      label: link.label ?? link.url ?? "Official link", url: link.url ?? "#",
      action: link.platform === "youtube" ? "Subscribe" : link.platform === "website" ? "Visit" : "Follow",
    })),
    recoveryRoutes: {},
  } : null);
  if (!creator || !creator.recoveryPassPublished) notFound();
  const [viewer, ownedCreator] = await Promise.all([getViewer(), getCreator()]);
  const metadataRole = viewer?.app_metadata?.role ?? viewer?.user_metadata?.role;
  const isAdmin = metadataRole === "admin" || viewer?.app_metadata?.is_admin === true;
  const isOwner = Boolean(viewer && ownedCreator?.owner_user_id === viewer.id && ownedCreator.public_slug === slug);
  const canUseDevTools = canAccessRecoveryDeveloperTools({
    isDevelopment: process.env.NODE_ENV === "development",
    isAdmin,
    isOwner,
  });
  const { data: publicUpdates } = supabase && databaseCreator
    ? await supabase.from("creator_updates").select("id,title,content,cta_url,media_url,sent_at")
      .eq("creator_id", databaseCreator.id).eq("status", "sent").order("sent_at", { ascending: false }).limit(10)
    : { data: [] };
  return <PublicCreatorExperience fallback={creator} source={src} canUseDevTools={canUseDevTools}
    publicUpdates={publicUpdates ?? []} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicCreatorExperience } from "@/components/public-creator-experience";
import { getDemoCreator } from "@/lib/public-creators";
import { getCreator, getViewer } from "@/lib/dal";
import { canAccessRecoveryDeveloperTools } from "@/lib/recovery-access";

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
  const creator = getDemoCreator(slug);
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
  return <PublicCreatorExperience fallback={creator} source={src} canUseDevTools={canUseDevTools} />;
}

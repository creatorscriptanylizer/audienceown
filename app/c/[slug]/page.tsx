import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicCreatorExperience } from "@/components/public-creator-experience";
import { getCreator, getViewer } from "@/lib/dal";
import { canAccessRecoveryDeveloperTools } from "@/lib/recovery-access";
import { createClient } from "@/lib/supabase/server";
import { getPublicCreatorPage } from "@/lib/public-creator-page";
import { parsePublicIdentityGraph, parsePublicTrust } from "@/lib/identity/public";
import { parseAuthenticityRecord } from "@/lib/authenticity/public";
import { appUrl } from "@/lib/app-url";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ src?: string }>;
};

function metadataImage(value: string | null) {
  if (!value) return undefined;
  if (value.startsWith("/")) return appUrl(value);
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublicCreatorPage(slug);
  if (!page || !page.creator.recoveryPassPublished) {
    return { title: "Creator not found", robots: { index: false, follow: false } };
  }
  const image = metadataImage(page.bannerImagePath ?? page.creator.avatar ?? null);
  const title = `${page.creator.displayName} — Recovery Pass`;
  const description = page.bio?.trim() || `The verified AudienceOwn recovery page for ${page.creator.displayName}.`;
  return {
    title,
    description,
    alternates: { canonical: appUrl(`/c/${page.creator.handle}`) },
    openGraph: {
      title,
      description,
      url: appUrl(`/c/${page.creator.handle}`),
      type: "profile",
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

export default async function Page({ params, searchParams }: Props) {
  const [{ slug }, { src }] = await Promise.all([params, searchParams]);
  const publicPage = await getPublicCreatorPage(slug);
  if (!publicPage || !publicPage.creator.recoveryPassPublished) notFound();

  const supabase = await createClient();
  const [viewer, ownedCreator, identityResults] = await Promise.all([
    getViewer(),
    getCreator(),
    supabase
      ? Promise.all([
        supabase.rpc("get_public_creator_identity_graph", { p_slug: publicPage.creator.handle }),
        supabase.rpc("get_public_creator_trust", { p_slug: publicPage.creator.handle }),
        supabase.rpc("get_public_creator_authenticity", { p_slug: publicPage.creator.handle }),
      ])
      : Promise.resolve([{ data: null, error: new Error("database unavailable") }, { data: null, error: new Error("database unavailable") }, { data: null, error: new Error("database unavailable") }]),
  ]);

  const metadataRole = viewer?.app_metadata?.role ?? viewer?.user_metadata?.role;
  const isAdmin = metadataRole === "admin" || viewer?.app_metadata?.is_admin === true;
  const isOwner = Boolean(viewer && ownedCreator?.owner_user_id === viewer.id
    && ownedCreator.public_slug === publicPage.creator.handle);
  const canUseDevTools = canAccessRecoveryDeveloperTools({
    isDevelopment: process.env.NODE_ENV === "development",
    isAdmin,
    isOwner,
  });
  const [{ data: identityData, error: identityError }, { data: trustData, error: trustError }, { data: authenticityData, error: authenticityError }] = identityResults;
  if (identityError || trustError || authenticityError)
    throw new Error("public_creator_supporting_data_unavailable", { cause: identityError ?? trustError ?? authenticityError });
  const parsedIdentity = parsePublicIdentityGraph(identityData);
  const trust = parsePublicTrust(trustData);
  const identityGraph = parsedIdentity ? { ...parsedIdentity, trust: trust ?? undefined } : null;

  return <PublicCreatorExperience
    fallback={publicPage.creator}
    source={src}
    canUseDevTools={canUseDevTools}
    publicUpdates={publicPage.updates}
    identityGraph={identityGraph}
    authenticity={parseAuthenticityRecord(authenticityData)}
  />;
}

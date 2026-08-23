import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicVerifiedIdentityView } from "@/components/authenticity/public-verified-identity";
import { getPublicVerifiedIdentity } from "@/lib/public-verified-identity";
import { getPublicAuthenticity, recordAuthenticityView } from "@/lib/authenticity/server";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicAuthenticity(slug);
  return result.status === "available" ? {
    title: `Verify ${result.data.creator.displayName} | AudienceOwn`,
    description: `Official accounts and trusted recovery destinations for ${result.data.creator.displayName}.`,
    openGraph: { title: `Verify ${result.data.creator.displayName} | AudienceOwn`, description: `Official accounts and trusted recovery destinations for ${result.data.creator.displayName}.`, type: "profile" },
  } : { title: "Verification unavailable", robots: { index: false } };
}

export default async function VerifyPage({ params }: Props) {
  const { slug } = await params;
  const result = await getPublicVerifiedIdentity(slug);
  if (result.status === "unavailable") return <main className="min-h-screen bg-zinc-950 px-5 py-12 text-white"><div className="mx-auto max-w-4xl"><h1 className="text-3xl font-semibold">Public verification temporarily unavailable</h1><p className="mt-3 text-zinc-400">This verification page could not be loaded right now.</p></div></main>;
  if (result.status === "absent") notFound();
  void recordAuthenticityView(slug, "page");
  return <PublicVerifiedIdentityView identity={result.data} />;
}

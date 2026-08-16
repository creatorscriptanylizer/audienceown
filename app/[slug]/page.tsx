import { notFound } from "next/navigation";
import LegacyCreatorPage, { generateMetadata as legacyMetadata } from "@/app/c/[slug]/page";
import { slugSchema } from "@/lib/validation";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ src?: string }> };

export async function generateMetadata(props: Props) {
  const { slug } = await props.params;
  if (!slugSchema.safeParse(slug).success) return { title: "Creator not found", robots: { index: false } };
  return legacyMetadata(props);
}

export default async function CreatorPage(props: Props) {
  const { slug } = await props.params;
  if (!slugSchema.safeParse(slug).success) notFound();
  return LegacyCreatorPage(props);
}

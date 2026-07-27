import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UpdateEditor } from "@/components/update-editor";
import { requireCreator } from "@/lib/dal";
import { parseBroadcastTypeQuery } from "@/lib/updates";

export default async function NewUpdatePage({ searchParams }: PageProps<"/dashboard/updates/new">) {
  await requireCreator();
  const { type } = await searchParams;
  return <>
    <Link href="/dashboard/updates" className="update-back-link"><ArrowLeft size={15}/> Update history</Link>
    <UpdateEditor initialBroadcastType={parseBroadcastTypeQuery(type)}/>
  </>;
}

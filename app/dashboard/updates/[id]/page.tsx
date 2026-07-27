import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { UpdateEditor } from "@/components/update-editor";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export default async function UpdatePage({ params }: PageProps<"/dashboard/updates/[id]">) {
  const creator = await requireCreator();
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data: update } = await supabase.from("creator_updates").select(
    "id,broadcast_type,status,title,subject,preview_text,content,cta_label,cta_url,scheduled_for",
  ).eq("id", id).eq("creator_id", creator.id).maybeSingle();
  if (!update) notFound();

  return <>
    <Link href="/dashboard/updates" className="update-back-link"><ArrowLeft size={15}/> Update history</Link>
    <UpdateEditor update={update}/>
  </>;
}

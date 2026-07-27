import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { formatBroadcastType, type BroadcastType } from "@/lib/updates";

function EmailPreview({ compact, creatorName, update }: {
  compact?: boolean;
  creatorName: string;
  update: {
    broadcast_type: string;
    subject: string;
    preview_text: string;
    content: string;
    cta_label: string | null;
    cta_url: string | null;
  };
}) {
  return <div className={`email-preview ${compact ? "is-mobile" : ""}`}>
    <div className="email-preview-inbox">
      <span>{creatorName.slice(0, 1).toUpperCase()}</span>
      <div><strong>{creatorName}</strong><p>{update.subject || "Your email subject"}</p></div>
    </div>
    <article>
      <p className="email-preview-type">{formatBroadcastType(update.broadcast_type as BroadcastType)}</p>
      <h2>{update.subject || "Your email subject"}</h2>
      {update.preview_text && <p className="email-preview-text">{update.preview_text}</p>}
      <div className="email-preview-content">{update.content || "Your message will appear here."}</div>
      {update.cta_label && update.cta_url && <a href={update.cta_url} target="_blank" rel="noreferrer">{update.cta_label}<ExternalLink size={14}/></a>}
      <footer>Sent by {creatorName} with AudienceOwn</footer>
    </article>
  </div>;
}

export default async function PreviewPage({ params }: PageProps<"/dashboard/updates/[id]/preview">) {
  const creator = await requireCreator();
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data: update } = await supabase.from("creator_updates").select(
    "id,broadcast_type,subject,preview_text,content,cta_label,cta_url",
  ).eq("id", id).eq("creator_id", creator.id).maybeSingle();
  if (!update) notFound();

  return <div className="update-preview-page">
    <Link href={`/dashboard/updates/${id}`} className="update-back-link"><ArrowLeft size={15}/> Back to editor</Link>
    <header>
      <p className="eyebrow">Preview only</p>
      <h1>See it before they do.</h1>
      <p>No email will be sent from this preview.</p>
    </header>
    <div className="email-preview-grid">
      <section><h2>Desktop</h2><EmailPreview creatorName={creator.display_name} update={update}/></section>
      <section><h2>Mobile</h2><EmailPreview compact creatorName={creator.display_name} update={update}/></section>
    </div>
  </div>;
}

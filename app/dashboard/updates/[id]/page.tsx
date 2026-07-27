import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { UpdateEditor } from "@/components/update-editor";
import { UpdateDeliveryPanel } from "@/components/update-delivery-panel";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { updatePublishSchema } from "@/lib/updates";

const deliveryStatuses = ["queued", "sending", "sent", "delivered", "failed", "skipped", "cancelled"] as const;
const deliveryTransports = ["email", "sms", "whatsapp", "browser_notification"] as const;

function safeCount(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && /^\d+$/.test(candidate) ? Number(candidate) : undefined;
}

export default async function UpdatePage({ params, searchParams }: PageProps<"/dashboard/updates/[id]">) {
  const creator = await requireCreator();
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data: update } = await supabase.from("creator_updates").select(
    "id,broadcast_type,status,title,subject,preview_text,content,cta_label,cta_url,scheduled_for",
  ).eq("id", id).eq("creator_id", creator.id).maybeSingle();
  if (!update) notFound();
  const { data: deliveries } = await supabase.from("update_deliveries").select("status,transport")
    .eq("update_id", id).eq("creator_id", creator.id);
  const counts = Object.fromEntries(deliveryStatuses.map((status) => [
    status,
    (deliveries ?? []).filter((delivery) => delivery.status === status).length,
  ])) as Record<(typeof deliveryStatuses)[number], number>;
  const transportCounts = Object.fromEntries(deliveryTransports.map((transport) => [
    transport,
    (deliveries ?? []).filter((delivery) => delivery.transport === transport).length,
  ])) as Record<(typeof deliveryTransports)[number], number>;
  const publishable = updatePublishSchema.safeParse({
    broadcast_type: update.broadcast_type,
    title: update.title,
    subject: update.subject,
    preview_text: update.preview_text,
    content: update.content,
    cta_label: update.cta_label ?? "",
    cta_url: update.cta_url ?? "",
  }).success;

  return <>
    <Link href="/dashboard/updates" className="update-back-link"><ArrowLeft size={15}/> Update history</Link>
    <UpdateEditor update={update}/>
    <UpdateDeliveryPanel
      updateId={id}
      counts={counts}
      transportCounts={transportCounts}
      canPrepare={publishable && (update.status === "draft" || update.status === "scheduled")}
      queueState={Array.isArray(query.queue) ? query.queue[0] : query.queue}
      created={safeCount(query.created)}
      duplicates={safeCount(query.duplicates)}
    />
  </>;
}

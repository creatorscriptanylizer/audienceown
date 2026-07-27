import Link from "next/link";
import { ArrowRight, CalendarClock, MailPlus } from "lucide-react";
import { requireCreator } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { getIntentDefinition, type BroadcastIntent } from "@/lib/broadcast-studio";
import { formatBroadcastStatus, formatBroadcastType, type BroadcastStatus, type BroadcastType } from "@/lib/updates";
import { LocalDateTime } from "@/components/local-date-time";

const filters = [
  ["all", "All"],
  ["draft", "Drafts"],
  ["scheduled", "Scheduled"],
  ["sent", "Sent"],
  ["failed", "Failed"],
] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function UpdatesPage({ searchParams }: PageProps<"/dashboard/updates">) {
  const creator = await requireCreator();
  const { filter = "all" } = await searchParams;
  const activeFilter = filters.some(([key]) => key === filter) ? filter : "all";
  const supabase = await createClient();
  const [{ data }, { data: deliveries }] = supabase ? await Promise.all([
    supabase.from("creator_updates").select(
      "id,broadcast_type,broadcast_intent,status,title,subject,scheduled_for,updated_at",
    ).eq("creator_id", creator.id).order("updated_at", { ascending: false }),
    supabase.from("update_deliveries").select("update_id").eq("creator_id", creator.id),
  ]) : [{ data: [] }, { data: [] }];
  const recipientCounts = new Map<string, number>();
  for (const delivery of deliveries ?? []) {
    recipientCounts.set(delivery.update_id, (recipientCounts.get(delivery.update_id) ?? 0) + 1);
  }
  const updates = (data ?? []).filter((update) => activeFilter === "all" || update.status === activeFilter);

  return <div className="updates-page">
    <header className="updates-page-header">
      <div>
        <p className="eyebrow">Direct connection</p>
        <h1>Updates</h1>
        <p>Write the message once, preview it carefully, and choose when it should reach your audience.</p>
      </div>
      <Link href="/dashboard/updates/new" className="button button-primary"><MailPlus size={16}/> Create update</Link>
    </header>

    <nav className="update-filter-tabs" aria-label="Filter updates">
      {filters.map(([key, label]) => <Link key={key} href={key === "all" ? "/dashboard/updates" : `/dashboard/updates?filter=${key}`} aria-current={activeFilter === key ? "page" : undefined}>{label}</Link>)}
    </nav>

    {updates.length === 0 ? <section className="updates-empty">
      <span><MailPlus size={24}/></span>
      <h2>{activeFilter === "all" ? "Your first weekly update starts here." : `No ${activeFilter} updates yet.`}</h2>
      <p>Keep your audience close with a short weekly note about what you made, what is next, or where they can find you.</p>
      <Link href="/dashboard/updates/new" className="button button-secondary">Create a draft <ArrowRight size={15}/></Link>
    </section> : <div className="update-history-list">
      {updates.map((update) => <Link href={`/dashboard/updates/${update.id}`} key={update.id} className="update-history-card">
        <div className="update-history-copy">
          <div className="update-history-meta">
            <span>{getIntentDefinition(update.broadcast_intent as BroadcastIntent).title} · {formatBroadcastType(update.broadcast_type as BroadcastType)}</span>
            <i className={`update-status status-${update.status}`}>{formatBroadcastStatus(update.status as BroadcastStatus)}</i>
          </div>
          <h2>{update.title || "Untitled update"}</h2>
          <p>{update.subject || "No subject yet"}</p>
        </div>
        <div className="update-history-time">
          {update.status === "scheduled" && update.scheduled_for && <strong><CalendarClock size={14}/><LocalDateTime value={update.scheduled_for}/></strong>}
          {recipientCounts.has(update.id) && <span>{recipientCounts.get(update.id)} prepared recipients</span>}
          <span>Updated {formatDate(update.updated_at)}</span>
          <ArrowRight size={17}/>
        </div>
      </Link>)}
    </div>}
  </div>;
}

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, ExternalLink, Video } from "lucide-react";
import { disconnectYouTube, updateYouTubeAutomation } from "@/app/dashboard/platforms/social-actions";

type Connection = {
  id: string; external_account_name: string | null; url: string; watch_enabled: boolean;
  auto_create_drafts: boolean; auto_send: boolean; last_sync_at: string | null;
  connection_health: string; last_connection_error: string | null;
};
type Activity = { id: string; title: string; body: string; created_at: string; creator_update_id: string | null };
type Draft = { id: string; title: string; updated_at: string };

export function YouTubeAutomationPanel({ connection, activity, drafts, status }: {
  connection: Connection | null; activity: Activity[]; drafts: Draft[]; status?: string;
}) {
  return <section className="surface mt-10 rounded-2xl p-5 sm:p-7">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="eyebrow">Social automation</p>
        <h2 className="mt-2 flex items-center gap-2 text-2xl font-semibold"><Video className="text-red-500"/> YouTube</h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">Detect new videos and livestreams, then prepare an editable AudienceOwn update.</p>
      </div>
      {!connection || connection.connection_health === "disconnected"
        ? <Link className="button button-primary" href="/api/integrations/youtube/connect">Connect YouTube</Link>
        : <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">
          <CheckCircle2 size={15}/> {connection.external_account_name ?? "Connected channel"}
        </span>}
    </div>
    {status && <p role="status" className="mt-4 rounded-lg bg-white/5 px-4 py-3 text-sm">
      {status === "connected" ? "YouTube connected. New content will create drafts for approval."
        : status === "saved" ? "Automation settings saved."
        : status === "confirm_auto_send" ? "Confirm the warning before enabling automatic sending."
        : status.replaceAll("_", " ")}
    </p>}
    {connection && connection.connection_health !== "disconnected" && <>
      {["degraded","expired","revoked"].includes(connection.connection_health) && <div className="mt-5 flex gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm">
        <AlertTriangle className="shrink-0 text-amber-300" size={18}/><div><strong className="capitalize">{connection.connection_health}</strong>
          <p className="mt-1 text-zinc-400">{connection.last_connection_error ?? "Reconnect YouTube to resume detection."}</p>
          <Link href="/api/integrations/youtube/connect" className="mt-2 inline-flex items-center gap-1 text-amber-200">Reconnect <ExternalLink size={13}/></Link></div>
      </div>}
      <form action={updateYouTubeAutomation} className="mt-6 grid gap-4">
        <input type="hidden" name="connection_id" value={connection.id}/>
        {[
          ["watch_enabled","Watch for new content","Poll this channel on the configured schedule.",connection.watch_enabled],
          ["auto_create_drafts","Create update drafts","Prepare one editable draft for each detected item.",connection.auto_create_drafts],
        ].map(([name,title,help,checked]) => <label key={String(name)} className="flex items-start gap-3 rounded-xl border border-white/10 p-4">
          <input className="mt-1" type="checkbox" name={String(name)} defaultChecked={Boolean(checked)}/>
          <span><strong>{String(title)}</strong><small className="mt-1 block text-zinc-400">{String(help)}</small></span>
        </label>)}
        <label className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
          <input className="mt-1" type="checkbox" name="auto_send" defaultChecked={connection.auto_send}/>
          <span><strong>Automatically publish and send</strong><small className="mt-1 block text-zinc-400">Off by default. This immediately uses the normal verified-audience delivery pipeline.</small>
            <span className="mt-3 flex items-center gap-2 text-xs text-amber-200"><input type="checkbox" name="confirm_auto_send" value="yes"/> I understand and explicitly enable automatic sending.</span></span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button className="button button-primary" type="submit">Save automation</button>
          <span className="flex items-center gap-1 text-xs text-zinc-500"><Clock3 size={13}/> Last sync: {connection.last_sync_at ? new Date(connection.last_sync_at).toLocaleString() : "Not synced yet"}</span>
        </div>
      </form>
      <form action={disconnectYouTube} className="mt-5 border-t border-white/10 pt-5">
        <input type="hidden" name="connection_id" value={connection.id}/>
        <button className="button button-secondary" type="submit">Disconnect YouTube</button>
      </form>
    </>}
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <div><h3 className="font-semibold">Drafts awaiting approval</h3>
        <div className="mt-3 space-y-2">{drafts.length ? drafts.map((draft) =>
          <Link key={draft.id} href={`/dashboard/updates/${draft.id}`} className="block rounded-xl border border-white/10 p-3 hover:border-white/20">
            <strong className="text-sm">{draft.title}</strong><span className="mt-1 block text-xs text-zinc-500">Review and publish</span>
          </Link>) : <p className="rounded-xl bg-white/[0.03] p-4 text-sm text-zinc-500">No YouTube drafts are waiting.</p>}</div>
      </div>
      <div><h3 className="font-semibold">Recent automation activity</h3>
        <div className="mt-3 space-y-2">{activity.length ? activity.map((item) =>
          <div key={item.id} className="rounded-xl border border-white/10 p-3"><strong className="text-sm">{item.title}</strong>
            <p className="text-xs text-zinc-400">{item.body}</p></div>)
          : <p className="rounded-xl bg-white/[0.03] p-4 text-sm text-zinc-500">Activity will appear after the first detection.</p>}</div>
      </div>
    </div>
  </section>;
}

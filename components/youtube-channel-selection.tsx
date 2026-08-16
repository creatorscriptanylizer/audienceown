"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiYoutube } from "react-icons/si";

export type YouTubeChannelChoice = {
  id: string; title: string; subscriberCount: string | null; hiddenSubscriberCount: boolean;
  connectedRole: "official" | "backup" | null;
};

function subscribers(value: string | null, hidden: boolean) {
  if (hidden) return "Subscriber count hidden";
  if (!value) return null;
  const count = Number(value);
  return Number.isFinite(count) ? `${new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(count)} subscribers` : null;
}

export function YouTubeChannelSelection({ pendingSelectionId, role, channels, returnTo }: {
  pendingSelectionId: string; role: "official" | "backup"; channels: YouTubeChannelChoice[]; returnTo?: "onboarding";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function select(channelId: string) {
    setBusy(channelId); setError(null);
    const response = await fetch("/api/integrations/youtube/select-channel", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ pendingSelectionId, selectedChannelId: channelId }),
    });
    const body = await response.json().catch(() => ({})) as { status?: string; message?: string };
    if (!response.ok) { setError(body.message ?? "This channel could not be selected. Please try again."); setBusy(null); return; }
    router.replace(returnTo === "onboarding" ? `/onboarding/accounts?step=${role}&oauth=youtube:connected` : "/dashboard/platforms?youtube=connected");
    router.refresh();
  }
  return <section className="surface mt-8 rounded-2xl p-5 sm:p-7" aria-labelledby="youtube-channel-picker-title">
    <p className="eyebrow">YouTube authorization</p>
    <h2 id="youtube-channel-picker-title" className="mt-2 text-2xl font-semibold">Choose your YouTube channel</h2>
    <p className="mt-2 text-sm text-zinc-400">Choose the YouTube channel you want to use as your {role === "backup" ? "Backup" : "Main"} Account.</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {channels.map((channel) => {
        const connected = channel.connectedRole !== null;
        return <article key={channel.id} className="rounded-xl border border-white/10 p-4">
          <div className="flex items-start gap-3"><span className="rounded-lg bg-red-600 p-2 text-white"><SiYoutube aria-hidden size={22}/></span>
            <div><h3 className="font-semibold">{channel.title}</h3>{subscribers(channel.subscriberCount, channel.hiddenSubscriberCount) && <p className="text-sm text-zinc-400">{subscribers(channel.subscriberCount, channel.hiddenSubscriberCount)}</p>}</div></div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className={`text-sm ${connected ? "text-zinc-400" : "text-emerald-300"}`}>{connected ? <>Already connected<br/><small>{channel.connectedRole === "official" ? "Main Account" : "Backup Account"}</small></> : "Available"}</span>
            <button type="button" className="button button-primary" disabled={connected || busy !== null} onClick={() => select(channel.id)}>
              {busy === channel.id ? "Connecting…" : `Use as ${role === "backup" ? "Backup" : "Main"}`}
            </button>
          </div>
        </article>;
      })}
    </div>
    {error && <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert">{error}</p>}
  </section>;
}

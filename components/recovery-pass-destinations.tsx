"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink } from "lucide-react";

type Destination = {
  id: string;
  type: string;
  provider: string | null;
  displayName: string;
  handle: string | null;
  profileUrl: string | null;
  selected: boolean;
  available: boolean;
};

export function RecoveryPassDestinations({ slug, preferenceToken }: { slug: string; preferenceToken?: string }) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const request = useCallback(async (destination?: Destination) => {
    if (!preferenceToken) return;
    const response = await fetch("/api/public/recovery-pass/destinations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, preferenceToken, ...(destination ? { destinationId: destination.id, selected: !destination.selected } : {}) }),
    });
    if (!response.ok) throw new Error("request_failed");
    const result = await response.json() as { destinations: Destination[] };
    setDestinations(result.destinations);
  }, [preferenceToken, slug]);

  useEffect(() => {
    if (!preferenceToken) return;
    // The request resolves asynchronously and hydrates server-authoritative selected state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void request().catch(() => setMessage("Recovery destinations are temporarily unavailable."));
  }, [preferenceToken, request]);

  if (!preferenceToken || (!destinations.length && !message)) return null;
  return <section className="mx-auto mt-6 w-full max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-5" aria-labelledby="recovery-destinations-title">
    <p className="fan-kicker">Recovery destinations</p>
    <h2 id="recovery-destinations-title" className="mt-1 text-xl font-semibold">Choose where you’ll find this creator</h2>
    <p className="mt-2 text-sm text-zinc-400">Select one or more backup paths. This records your AudienceOwn opt-in; opening a platform does not verify a native follow or membership.</p>
    {message && <p className="mt-3 text-sm text-amber-200" role="status">{message}</p>}
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {destinations.map((destination) => <article key={destination.id} className={`rounded-xl border p-4 ${destination.selected ? "border-emerald-400/50 bg-emerald-400/5" : "border-white/10"}`}>
        <small className="uppercase tracking-wide text-zinc-500">{destination.provider ?? destination.type.replaceAll("_", " ")}</small>
        <strong className="mt-1 block">{destination.displayName}</strong>
        {destination.handle && <span className="mt-1 block text-sm text-zinc-400">{destination.handle}</span>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={destination.selected ? "button button-secondary" : "button button-primary"} disabled={busy === destination.id} onClick={async () => {
            setBusy(destination.id); setMessage("");
            try { await request(destination); } catch { setMessage("That recovery destination could not be updated."); }
            finally { setBusy(null); }
          }}>{destination.selected ? <><Check size={14} /> Selected — remove</> : "Add recovery destination"}</button>
          {destination.profileUrl && <a className="button button-secondary" href={destination.profileUrl} target="_blank" rel="noopener noreferrer">Open destination <ExternalLink size={13} /></a>}
        </div>
      </article>)}
    </div>
  </section>;
}

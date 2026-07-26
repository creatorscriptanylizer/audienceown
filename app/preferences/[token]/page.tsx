"use client";

import { use, useState } from "react";
import { ShieldCheck } from "lucide-react";

export default function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [status, setStatus] = useState("");
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base) return setStatus("Pass management is unavailable.");
    const response = await fetch(`${base}/functions/v1/preferences`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        preferences: {
          recovery: true,
          videos: form.get("videos") === "on",
          livestreams: form.get("livestreams") === "on",
          announcements: form.get("announcements") === "on",
          products: form.get("products") === "on",
        },
      }),
    });
    const data = await response.json();
    setStatus(data.status === "saved" ? "Recovery Pass updated." : data.status === "deactivated" ? "This Recovery Pass is deactivated." : "This private link is invalid.");
  }
  return <main className="grid min-h-screen place-items-center px-5">
    <form onSubmit={save} className="surface w-full max-w-lg rounded-2xl p-7">
      <p className="eyebrow">Private Recovery Pass</p>
      <h1 className="mt-2 text-2xl font-semibold">Manage Recovery Pass</h1>
      <p className="mt-2 text-sm text-zinc-400">Choose what you want to hear about.</p>
      <div className="my-6 grid gap-3">
        <div className="flex gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4"><ShieldCheck className="text-emerald-300" size={20}/><span><strong className="block text-sm">Recovery alerts · Required</strong><small className="mt-1 block text-zinc-400">Active while your Recovery Pass is active.</small></span></div>
        <label><input type="checkbox" name="videos"/> New videos</label>
        <label><input type="checkbox" name="livestreams"/> Live streams</label>
        <label><input type="checkbox" name="announcements"/> Announcements</label>
        <label><input type="checkbox" name="products"/> Official products</label>
      </div>
      <button className="button button-primary">Save preferences</button>
      {status && <p role="status" className="mt-4 text-sm text-zinc-300">{status}</p>}
    </form>
  </main>;
}

import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ExternalLink, Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SubscribeForm } from "@/components/subscribe-form";
import { platformFromAccount } from "@/lib/platforms";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ src?: string }> };
async function load(slug: string) {
  const s = await createClient();
  if (!s) return null;
  const { data: creator } = await s.from("creators")
    .select("id,display_name,public_slug,public_bio,profile_image_path,banner_image_path,announcement_title,announcement_body,announcement_cta_label,announcement_cta_url,announcement_published_at")
    .eq("public_slug", slug).eq("public_profile_enabled", true).maybeSingle();
  if (!creator) return null;
  const { data: accounts } = await s.from("connected_accounts")
    .select("id,platform,account_type,label,url,is_primary,position")
    .eq("creator_id", creator.id).eq("is_public", true).order("position");
  return { creator, accounts: accounts ?? [], s };
}
export async function generateMetadata({params}: Props): Promise<Metadata> {
  const { slug } = await params;
  const value = await load(slug);
  if (!value) return { title: "Creator not found", robots: { index: false } };
  return { title: value.creator.display_name, description: value.creator.public_bio };
}
export default async function Page({params,searchParams}: Props) {
  const { slug } = await params;
  const { src } = await searchParams;
  const value = await load(slug);
  if (!value) notFound();
  const { creator: p, accounts, s } = value;
  const media = (path: string|null) => path ? s.storage.from("creator-media").getPublicUrl(path).data.publicUrl : null;
  const official = accounts.filter(x=>x.account_type==="official");
  const backup = accounts.filter(x=>x.account_type==="backup");
  return <main className="min-h-screen pb-16">
    <div className="h-48 w-full bg-[#15151a] sm:h-72">{media(p.banner_image_path)&&<Image src={media(p.banner_image_path)!} alt="" width={1600} height={500} className="h-full w-full object-cover" priority/>}</div>
    <div className="mx-auto max-w-3xl px-5"><header className="-mt-14"><div className="size-28 overflow-hidden rounded-2xl border-4 border-[#08080a] bg-zinc-800">{media(p.profile_image_path)?<Image src={media(p.profile_image_path)!} alt={`${p.display_name} profile`} width={112} height={112} className="h-full w-full object-cover"/>:<div className="grid h-full place-items-center"><Radio/></div>}</div><h1 className="mt-5 text-3xl font-semibold">{p.display_name}</h1><p className="mt-1 text-sm text-zinc-500">@{p.public_slug}</p>{p.public_bio&&<p className="mt-5 whitespace-pre-wrap leading-7 text-zinc-300">{p.public_bio}</p>}</header>
    {p.announcement_published_at&&<section className="surface mt-10 rounded-2xl border-violet-500/30 p-6"><p className="eyebrow">Current announcement</p><h2 className="mt-2 text-xl font-semibold">{p.announcement_title}</h2><p className="mt-3 whitespace-pre-wrap text-zinc-300">{p.announcement_body}</p>{p.announcement_cta_url&&<a href={p.announcement_cta_url} target="_blank" rel="noreferrer" className="button button-primary mt-5">{p.announcement_cta_label||"Learn more"} <ExternalLink size={15}/></a>}</section>}
    {([["Official accounts",official],["Backup accounts",backup]] as const).map(([title,list])=>list.length>0&&<section key={title} className="mt-9"><h2 className="eyebrow">{title}</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{list.map(x=>{const platform=platformFromAccount(x.platform,x.url);const PlatformIcon=platform.icon;return <a key={x.id} href={x.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border bg-[#151518] p-4"><span className="flex items-center gap-3"><i className="platform-brand-icon" style={{color:platform.brandColor,background:platform.brandBackground}}><PlatformIcon size={18}/></i><span><small className="block text-zinc-500">{platform.name}{x.is_primary?" · primary":""}</small>{x.label}</span></span><ExternalLink size={16}/></a>})}</div></section>)}
    <section className="recovery-pass-card mt-12 rounded-3xl p-6 sm:p-8"><p className="eyebrow">One-Tap Recovery Pass</p><h2 className="mt-3 text-3xl font-semibold">Back up @{p.public_slug}</h2><p className="mt-3 text-base text-zinc-300">Never lose this creator. Get notified if their account is deleted, banned, hacked, hidden, or moved.</p><div className="mt-6"><SubscribeForm handle={p.public_slug} creatorName={p.display_name} source={src}/></div></section>
    <footer className="mt-12 flex items-center justify-center gap-2 text-xs text-zinc-600"><Radio size={13}/>Powered by AudienceOwn</footer></div>
  </main>;
}

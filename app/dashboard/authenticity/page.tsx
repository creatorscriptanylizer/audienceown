import { VerifiedCreatorCard } from "@/components/authenticity/verified-creator-card";
import { VerificationQr } from "@/components/authenticity/verification-qr";
import { CopyLinkButton } from "@/components/copy-link-button";
import { requireCreator } from "@/lib/dal";
import { logPageQueryFailure } from "@/lib/data-availability";
import { parseAuthenticityRecord, publicBaseUrl } from "@/lib/authenticity/public";
import { createClient } from "@/lib/supabase/server";
import { requestAssertionRefresh, saveAuthenticitySettings, setupAuthenticity } from "./actions";

const pageName = "dashboard/authenticity";

function Header() {
  return <header><p className="eyebrow">Public authenticity</p><h1 className="mt-2 text-3xl font-semibold">Authenticity</h1><p className="mt-2 max-w-3xl text-sm text-zinc-400">Control how your verified identity is presented. Verification state, official status, and safety suppression are derived automatically.</p></header>;
}

function Unavailable() {
  return <div className="space-y-6"><Header/><section className="surface rounded-2xl p-6"><h2 className="text-lg font-semibold">Authenticity temporarily unavailable</h2><p className="mt-2 text-sm text-zinc-400">We could not load your authenticity settings right now. Please try again later.</p></section></div>;
}

export default async function AuthenticityDashboard() {
  const creator = await requireCreator();
  const db = await createClient();
  if (!db) return <Unavailable/>;

  // Page rendering is SELECT-only. Only the explicit setup Server Action creates records.
  const profileResult = await db.from("creator_authenticity_profiles").select("*").eq("creator_id", creator.id).maybeSingle();
  if (profileResult.error) {
    logPageQueryFailure(pageName, "creator_authenticity_profiles", profileResult.error);
    return <Unavailable/>;
  }
  const profile = profileResult.data;
  if (!profile) return <div className="space-y-6"><Header/><section className="surface rounded-2xl p-6"><h2 className="text-lg font-semibold">Build a verifiable public record of your creator identity.</h2><p className="mt-2 text-sm text-zinc-400">Authenticity isn’t configured yet.</p><form action={setupAuthenticity}><button className="button button-primary mt-5">Set up Authenticity</button></form></section></div>;

  const slug = creator.public_slug ?? "";
  const [publicResult, assertionResult, eventsResult, accountsResult, domainsResult] = await Promise.all([
    db.rpc("get_public_creator_authenticity", { p_slug: slug }),
    db.from("creator_authenticity_assertions").select("key_id,issued_at,expires_at,revoked_at,superseded_at").eq("creator_id", creator.id).order("issued_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("creator_authenticity_events").select("id,event_type,source,created_at").eq("creator_id", creator.id).order("id", { ascending: false }).limit(20),
    db.from("creator_identity_accounts").select("provider,display_handle,official,public_visible,verification_status").eq("creator_id", creator.id),
    db.from("creator_identity_domains").select("hostname,official,public_visible,verification_status").eq("creator_id", creator.id),
  ]);
  for (const [query, error] of [["get_public_creator_authenticity", publicResult.error], ["creator_authenticity_assertions", assertionResult.error], ["creator_authenticity_events", eventsResult.error], ["creator_identity_accounts", accountsResult.error], ["creator_identity_domains", domainsResult.error]] as const) logPageQueryFailure(pageName, query, error);

  const record = publicResult.error ? null : parseAuthenticityRecord(publicResult.data);
  const base = publicBaseUrl();
  const verificationUrl = `${base}/verify/${slug}`;
  const embed = `<iframe src="${base}/embed/verify/${slug}" title="Verify ${creator.display_name}"></iframe>`;
  const suppressed = accountsResult.error || domainsResult.error ? null : [
    ...(accountsResult.data ?? []).filter(x => !x.official || !x.public_visible || x.verification_status !== "verified").map(x => `${x.provider}: ${x.display_handle ?? "account"}`),
    ...(domainsResult.data ?? []).filter(x => !x.official || !x.public_visible || x.verification_status !== "verified").map(x => x.hostname),
  ];
  const assertion = assertionResult.error ? null : assertionResult.data;
  const events = eventsResult.error ? null : eventsResult.data;

  return <div className="space-y-6"><Header/><div className="grid gap-6 xl:grid-cols-2"><section>{publicResult.error?<div className="surface rounded-2xl p-6 text-sm text-zinc-400">Public authenticity is temporarily unavailable.</div>:record?<VerifiedCreatorCard record={record}/>:<div className="surface rounded-2xl p-6 text-sm text-zinc-400">Public authenticity is currently disabled or suppressed.</div>}</section><section className="surface rounded-2xl p-6"><h2 className="text-lg font-semibold">Public tools</h2><div className="mt-4 flex flex-wrap gap-2"><CopyLinkButton value={verificationUrl} label="Copy verification URL"/><CopyLinkButton value={embed} label="Copy embed code"/></div>{profile.qr_enabled&&<div className="mt-5"><VerificationQr url={verificationUrl} size={130}/></div>}</section></div><form action={saveAuthenticitySettings} className="surface rounded-2xl p-6"><h2 className="text-lg font-semibold">Presentation settings</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{[["display","Publish authenticity profile",profile.display_enabled],["embed","Allow embeds",profile.embed_enabled],["qr","Allow QR verification",profile.qr_enabled],["timestamps","Show safe verification dates",profile.show_verified_timestamps],["history","Show public continuity history",profile.show_relationship_history]].map(([name,label,checked])=><label className="flex items-center gap-3 rounded-xl border p-3 text-sm" key={String(name)}><input type="checkbox" name={String(name)} defaultChecked={Boolean(checked)}/>{String(label)}</label>)}</div><label className="label mt-5">Optional public title</label><input className="input" name="title" maxLength={100} defaultValue={profile.public_title??""}/><label className="label mt-4">Optional public summary</label><textarea className="input min-h-24" name="summary" maxLength={280} defaultValue={profile.public_summary??""}/><button className="button button-primary mt-5">Save presentation</button></form><div className="grid gap-6 xl:grid-cols-2"><section className="surface rounded-2xl p-6"><h2 className="font-semibold">Assertion status</h2>{assertionResult.error?<p className="mt-3 text-sm text-zinc-400">Assertion status is temporarily unavailable.</p>:<><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><dt className="text-zinc-500">Signing</dt><dd>{process.env.AUTHENTICITY_SIGNING_PRIVATE_KEY?"Configured":"Unavailable"}</dd></div><div className="flex justify-between"><dt className="text-zinc-500">Key</dt><dd>{assertion?.key_id??"—"}</dd></div><div className="flex justify-between"><dt className="text-zinc-500">Expires</dt><dd>{assertion?.expires_at?new Date(assertion.expires_at).toLocaleString():"—"}</dd></div></dl><form action={requestAssertionRefresh}><button className="button button-secondary mt-4">Request assertion refresh</button></form></>}</section><section className="surface rounded-2xl p-6"><h2 className="font-semibold">Suppressed content</h2>{suppressed===null?<p className="mt-3 text-sm text-zinc-400">Suppressed content is temporarily unavailable.</p>:suppressed.length?<ul className="mt-3 space-y-2 text-sm text-zinc-400">{suppressed.map(x=><li key={x}>{x} — not public, official, and currently verified</li>)}</ul>:<p className="mt-3 text-sm text-zinc-500">No identity destinations are suppressed.</p>}</section></div><section className="surface rounded-2xl p-6"><h2 className="font-semibold">Recent authenticity events</h2>{events===null?<p className="mt-3 text-sm text-zinc-400">Authenticity history is temporarily unavailable.</p>:events.length?<ul className="mt-4 space-y-2 text-sm">{events.map(e=><li className="flex justify-between border-b border-white/10 pb-2" key={e.id}><span>{e.event_type.replaceAll("_"," ")}</span><time className="text-zinc-500">{new Date(e.created_at).toLocaleString()}</time></li>)}</ul>:<p className="mt-3 text-sm text-zinc-500">No authenticity events yet.</p>}</section></div>;
}

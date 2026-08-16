import { CopyLinkButton } from "@/components/copy-link-button";
import { UnavailableState } from "@/components/product-state";
import { buildAuthenticityManifest, domainDiscoveryDocument, serializeManifest } from "@/lib/authenticity/manifest";
import { getPublicAuthenticity } from "@/lib/authenticity/server";
import { requireCreator } from "@/lib/dal";
import { logPageQueryFailure } from "@/lib/data-availability";
import { publicBaseUrl } from "@/lib/authenticity/public";
import { createClient } from "@/lib/supabase/server";

export default async function AuthenticityLayout({ children }: { children: React.ReactNode }) {
  const creator = await requireCreator();
  const slug = creator.public_slug ?? "";
  const db = await createClient();
  const [publicResult, statementsResult, subscriptionsResult] = await Promise.all([
    getPublicAuthenticity(slug),
    db ? db.from("creator_continuity_statements").select("id,statement_type,provider,issued_at,revoked_at,superseded_at").eq("creator_id",creator.id).order("issued_at",{ascending:false}).limit(10) : Promise.resolve({ data: null, error: new Error("Database unavailable") }),
    db ? db.from("authenticity_network_subscriptions").select("id,endpoint_url,status,event_types,last_success_at,last_failure_at").eq("creator_id",creator.id).order("created_at",{ascending:false}) : Promise.resolve({ data: null, error: new Error("Database unavailable") }),
  ]);
  logPageQueryFailure("dashboard/authenticity/layout", "creator_continuity_statements", statementsResult.error);
  logPageQueryFailure("dashboard/authenticity/layout", "authenticity_network_subscriptions", subscriptionsResult.error);

  const record = publicResult.status === "available" ? publicResult.data : null;
  const base = publicBaseUrl();
  const manifestUrl = `${base}/api/public/creators/${slug}/manifest`;
  const feedUrl = `${base}/api/public/creators/${slug}/authenticity/events`;
  const continuityUrl = `${base}/api/public/creators/${slug}/continuity`;
  const manifest = record ? buildAuthenticityManifest(record) : null;
  const domainJson = manifest ? JSON.stringify(domainDiscoveryDocument(manifest),null,2) : "Unavailable";
  const statements = statementsResult.data ?? [];
  const subscriptions = subscriptionsResult.data ?? [];

  return <>{children}<section className="mt-6 space-y-6"><header><p className="eyebrow">Authenticity Network</p><h2 className="mt-2 text-2xl font-semibold">Portable identity proofs</h2><p className="mt-2 text-sm text-zinc-400">Publish manifests, continuity proofs, safe event feeds, webhooks, and SDK-verifiable records.</p></header><div className="grid gap-6 xl:grid-cols-2"><article className="surface rounded-2xl p-6"><h3 className="font-semibold">Public manifest and discovery</h3>{publicResult.status === "unavailable" ? <UnavailableState className="mt-4" compact title="Public authenticity temporarily unavailable" description="The public authenticity projection could not be loaded right now."/> : publicResult.status === "absent" ? <p className="mt-3 text-sm text-zinc-500">Public authenticity is not published.</p> : <><div className="mt-4 flex flex-wrap gap-2"><CopyLinkButton value={manifestUrl} label="Copy manifest URL"/><CopyLinkButton value="/.well-known/audienceown.json" label="Copy well-known path"/><CopyLinkButton value={domainJson} label="Copy domain JSON"/></div><pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-black p-3 text-xs text-zinc-400">{serializeManifest(manifest!)}</pre></>}</article><article className="surface rounded-2xl p-6"><h3 className="font-semibold">Developer endpoints</h3><div className="mt-4 flex flex-wrap gap-2"><CopyLinkButton value={feedUrl} label="Copy event feed"/><CopyLinkButton value={continuityUrl} label="Copy continuity URL"/><CopyLinkButton value={`${base}/.well-known/audienceown-network.json`} label="Copy network discovery"/></div><pre className="mt-4 overflow-auto rounded-xl bg-black p-3 text-xs text-zinc-400">{`const client = new AudienceOwnAuthenticityClient({ issuer: "${base}" });\nconst manifest = await client.manifest("${slug}");`}</pre></article></div><div className="grid gap-6 xl:grid-cols-2"><article className="surface rounded-2xl p-6"><h3 className="font-semibold">Continuity statements</h3>{statementsResult.error ? <UnavailableState className="mt-4" compact title="Continuity statements unavailable" description="Continuity history could not be loaded right now."/> : statements.length ? <ul className="mt-4 space-y-2 text-sm">{statements.map(s=><li className="flex justify-between border-b border-white/10 pb-2" key={s.id}><a className="text-violet-300" href={`/api/public/creators/${slug}/continuity/${s.id}`}>{s.statement_type.replaceAll("_"," ")} · {s.provider}</a><span className="text-zinc-500">{s.revoked_at?"Revoked":s.superseded_at?"Superseded":"Current"}</span></li>)}</ul> : <p className="mt-3 text-sm text-zinc-500">No continuity statements yet.</p>}</article><article className="surface rounded-2xl p-6"><h3 className="font-semibold">Webhook subscriptions</h3><p className="mt-2 text-xs text-zinc-500">Manage via `/api/developer/authenticity/subscriptions`. Secrets are shown only at creation or rotation.</p>{subscriptionsResult.error ? <UnavailableState className="mt-4" compact title="Network subscriptions unavailable" description="Webhook subscription status could not be loaded right now."/> : subscriptions.length ? <ul className="mt-4 space-y-2 text-sm">{subscriptions.map(s=><li className="border-b border-white/10 pb-2" key={s.id}><span className="block break-all">{s.endpoint_url}</span><small className="text-zinc-500">{s.status} · {s.event_types.length} event types</small></li>)}</ul> : <p className="mt-3 text-sm text-zinc-500">No network subscriptions yet.</p>}</article></div></section></>;
}

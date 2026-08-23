import Link from "next/link";
import { CalendarDays, Clock3, Info, KeyRound, Mail, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { AccountDeletionForm } from "@/components/account-deletion-form";
import { MfaPanel } from "@/components/mfa-panel";
import { isAppAdmin } from "@/lib/app-admin";
import { requireViewer } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

const EXPECTED_SUPABASE_PROJECT_REF = "jngmxlcibqmtrvskxdcw";

function projectRef(url: string | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith(".supabase.co") ? parsed.hostname.split(".")[0] : parsed.hostname;
  } catch { return null; }
}

function authenticationMethod(user: Awaited<ReturnType<typeof requireViewer>>) {
  const providers = new Set([user.app_metadata.provider, ...(user.app_metadata.providers ?? [])].filter((value): value is string => typeof value === "string"));
  if (providers.has("google") && providers.has("email")) return "Email and Google Sign-In";
  if (providers.has("google")) return "Google Sign-In";
  return "Email and password";
}

function formatAccountDate(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Unavailable";
}

const detailRows = [
  { label: "Email", key: "email", Icon: Mail, tone: "violet" },
  { label: "Authentication", key: "authentication", Icon: KeyRound, tone: "indigo" },
  { label: "Account created", key: "created", Icon: CalendarDays, tone: "cyan" },
  { label: "Most recent sign-in", key: "sign-in", Icon: Clock3, tone: "emerald" },
] as const;

export default async function AccountSettingsPage() {
  const user = await requireViewer();
  const supabase = await createClient();
  const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const admin = await isAppAdmin(user.id);
  const values = { email: user.email ?? "Unavailable", authentication: authenticationMethod(user), created: formatAccountDate(user.created_at), "sign-in": formatAccountDate(user.last_sign_in_at) };

  return <div className="account-security-page">
    <header className="account-security-hero"><div className="relative z-10"><p className="eyebrow">Settings</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Account &amp; Security</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Review sign-in details and protect the AudienceOwn account that owns your creator identity.</p>{admin && <span className="mt-5 inline-flex rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-xs font-medium text-violet-200">AudienceOwn Admin</span>}</div><span className="account-security-hero-icon" aria-hidden><ShieldCheck size={30}/><Sparkles size={13}/></span></header>

    <section className="security-card security-card-violet mt-8" aria-labelledby="account-information-heading"><div className="security-card-heading"><span><Mail aria-hidden size={19}/></span><div><h2 id="account-information-heading">Account information</h2><p>The identity and sign-in details associated with your AudienceOwn account.</p></div></div><dl className="security-detail-list">{detailRows.map(({ label, key, Icon, tone }) => <div key={key} className="security-detail-row"><span className={`security-detail-icon tone-${tone}`}><Icon aria-hidden size={17}/></span><dt>{label}</dt><dd>{values[key]}</dd></div>)}</dl><div className="security-info-strip tone-cyan"><Info aria-hidden size={16}/><p>Google Sign-In and a YouTube connection are separate. This page does not detach sign-in methods.</p></div></section>

    <section className="security-card security-card-violet mt-8" aria-labelledby="mfa-heading"><div className="security-card-heading"><span><ShieldCheck aria-hidden size={19}/></span><div><h2 id="mfa-heading">Authenticator app</h2><p>TOTP two-factor authentication</p></div></div><p className="mb-6 mt-4 text-sm leading-6 text-zinc-400">Use a compatible authenticator app for an additional code at sign-in.</p><MfaPanel debug={process.env.NODE_ENV !== "production" && process.env.AUDIENCEOWN_DEBUG === "1"} serverAuth={{ sessionPresent: Boolean(sessionData.session), userPresent: Boolean(user), projectRef: projectRef(process.env.NEXT_PUBLIC_SUPABASE_URL), expectedProjectRef: EXPECTED_SUPABASE_PROJECT_REF }}/></section>

    <section className="security-danger mt-8" aria-labelledby="danger-zone-heading"><div className="security-card-heading"><span><ShieldAlert aria-hidden size={19}/></span><div><p className="security-danger-eyebrow">Danger zone</p><h2 id="danger-zone-heading">Delete AudienceOwn account</h2></div></div><p id="account-deletion-description" className="mt-5 max-w-2xl text-sm leading-6 text-zinc-300">Deletion is intended to be permanent. It disables and revokes connected providers, removes encrypted credentials and authorized Google and YouTube data, stops synchronization, deletes creator-owned application data, invalidates sessions, and deletes the authentication account last. Content hosted by YouTube is never deleted.</p><div className="security-danger-note"><ShieldAlert aria-hidden size={16}/><p>A sign-in from the last 15 minutes is required. If provider cleanup cannot finish, deletion stops and shows a retryable error instead of reporting success. <Link href="/contact?topic=account_sign_in">Contact support</Link> if you need help.</p></div><AccountDeletionForm/></section>

    <nav aria-label="Account policy links" className="mt-8 flex flex-wrap gap-4 text-sm text-zinc-500"><Link className="hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400" href="/data-deletion">Data deletion details</Link><Link className="hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400" href="/privacy">Privacy</Link></nav>
  </div>;
}

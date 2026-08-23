"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, Info, KeyRound, ShieldCheck, ShieldQuestion } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/browser";

type Factor = { id: string; friendly_name?: string; factor_type?: string; status: string };
type Message = { kind: "status" | "error"; text: string };
type SafeDiagnostic = {
  stage: string;
  ok: boolean;
  errorName?: string | null;
  errorCode?: string | null;
  httpStatus?: number | null;
  messageCategory?: string | null;
  sessionPresent?: boolean;
  userPresent?: boolean;
  allFactorCount?: number;
  verifiedTotpCount?: number;
  unverifiedTotpCount?: number;
  factorStatuses?: string[];
  currentLevel?: string | null;
  nextLevel?: string | null;
  mfaEnrollAttempt?: number;
  hasFactorId?: boolean;
  hasQrCode?: boolean;
  hasSecret?: boolean;
  hasUri?: boolean;
  setupStateStored?: boolean;
  qrRenderReached?: boolean;
  browserSessionPresent?: boolean;
  browserUserPresent?: boolean;
  getSessionErrorCode?: string | null;
  getSessionStatus?: number | null;
  getUserErrorCode?: string | null;
  getUserStatus?: number | null;
  serverSessionPresent?: boolean;
  serverUserPresent?: boolean;
  projectMatch?: boolean;
  authStorageDetected?: boolean;
  browserProjectMatch?: boolean;
  preflightStage?: string;
  refreshAttempted?: boolean;
  refreshSucceeded?: boolean;
  sameProject?: boolean;
  reauthRequired?: boolean;
  mfaEnrollReached?: boolean;
};

type SafeAuthError = { name?: string; code?: string; status?: number; message?: string };

function factorState(factors: Factor[]) {
  return {
    verified: factors.filter((factor) => factor.status === "verified").length,
    unverified: factors.filter((factor) => factor.status === "unverified").length,
  };
}

function errorCategory(error?: SafeAuthError | null) {
  if (!error) return null;
  const { code = "", message = "" } = error;
  const value = `${code} ${message}`.toLowerCase();
  if (/session|jwt|token|logged.in|auth/.test(value)) return "auth_session";
  if (/aal|assurance|reauth|recent/.test(value)) return "reauth_or_aal";
  if (/factor.*limit|maximum.*factor|already.*factor|duplicate/.test(value)) return "factor_limit_or_duplicate";
  if (/mfa.*disabled|totp.*disabled|not.*enabled|unsupported/.test(value)) return "mfa_configuration";
  if (/network|fetch|cors|origin/.test(value)) return "network_or_origin";
  if (/invalid|parameter|argument|payload/.test(value)) return "invalid_request";
  return "provider_error";
}

type ServerAuthContext = {
  sessionPresent: boolean;
  userPresent: boolean;
  projectRef: string | null;
  expectedProjectRef: string;
};

function projectRef(url: string | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith(".supabase.co") ? parsed.hostname.split(".")[0] : parsed.hostname;
  } catch { return null; }
}

export function MfaPanel({ debug = false, serverAuth }: { debug?: boolean; serverAuth?: ServerAuthContext }) {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [enrol, setEnrol] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [reauthRequired, setReauthRequired] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const enrollAttempt = useRef(0);

  function diagnose(details: SafeDiagnostic) {
    if (debug) console.info("[AUDIENCEOWN MFA]", details);
  }

  async function snapshot(stage: string, error?: SafeAuthError | null, knownFactors?: Factor[]) {
    if (!supabase || !debug) return;
    const [{ data: sessionData }, { data: userData }, listed, aal] = await Promise.all([
      supabase.auth.getSession(),
      supabase.auth.getUser(),
      knownFactors ? Promise.resolve(null) : supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    const all = knownFactors ?? (listed?.data?.all as Factor[] | undefined) ?? [];
    const totp = all.filter((factor) => factor.factor_type === "totp");
    const counts = factorState(totp);
    diagnose({
      stage,
      ok: !error,
      errorName: error?.name ?? null,
      errorCode: error?.code ?? null,
      httpStatus: error?.status ?? null,
      messageCategory: errorCategory(error),
      sessionPresent: Boolean(sessionData.session),
      userPresent: Boolean(userData.user),
      allFactorCount: all.length,
      verifiedTotpCount: counts.verified,
      unverifiedTotpCount: counts.unverified,
      factorStatuses: [...new Set(totp.map((factor) => factor.status))].sort(),
      currentLevel: aal.data?.currentLevel ?? null,
      nextLevel: aal.data?.nextLevel ?? null,
    });
  }

  async function refresh() {
    if (!supabase) { setLoading(false); return; }
    const { data, error } = await supabase.auth.mfa.listFactors();
    const all = (data?.all as Factor[] | undefined) ?? [];
    if (error) setMessage({ kind: "error", text: "Authenticator status could not be loaded. Refresh and try again." });
    else setFactors(all.filter((factor) => factor.factor_type === "totp" && factor.status === "verified"));
    await snapshot("status", error, all);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      await Promise.resolve();
      if (!active || !supabase) { if (active) setLoading(false); return; }
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (!active) return;
      const all = (data?.all as Factor[] | undefined) ?? [];
      if (error) setMessage({ kind: "error", text: "Authenticator status could not be loaded. Refresh and try again." });
      else setFactors(all.filter((factor) => factor.factor_type === "totp" && factor.status === "verified"));
      await snapshot("status", error, all);
      if (active) setLoading(false);
    }
    void load();
    return () => { active = false; };
    // The browser client is stable for this component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    if (!debug || !enrol) return;
    console.info("[AUDIENCEOWN MFA]", {
      stage: "mfa_setup_render",
      ok: true,
      setupStateStored: true,
      qrRenderReached: true,
    } satisfies SafeDiagnostic);
  }, [debug, enrol]);

  async function begin() {
    if (!supabase || busy) return;
    setBusy(true);
    setMessage(null);
    setReauthRequired(false);

    enrollAttempt.current += 1;
    const attempt = enrollAttempt.current;

    // Keep these sequential so diagnostics identify the first failed auth call
    // and only refresh a session that the browser can actually recover.
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const browserProjectRef = projectRef(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const sameProject = Boolean(browserProjectRef && serverAuth?.projectRef && browserProjectRef === serverAuth.projectRef);
    const reportPreflight = (details: {
      preflightStage: string;
      userPresent: boolean;
      getUserErrorCode?: string | null;
      refreshAttempted?: boolean;
      refreshSucceeded?: boolean;
      reauthRequired?: boolean;
      mfaEnrollReached?: boolean;
    }) => diagnose({
      stage: "mfa_auth_preflight",
      ok: !sessionError && Boolean(sessionData.session) && details.userPresent,
      preflightStage: details.preflightStage,
      sessionPresent: Boolean(sessionData.session),
      getSessionErrorCode: sessionError?.code ?? null,
      userPresent: details.userPresent,
      getUserErrorCode: details.getUserErrorCode ?? null,
      refreshAttempted: details.refreshAttempted ?? false,
      refreshSucceeded: details.refreshSucceeded ?? false,
      sameProject,
      reauthRequired: details.reauthRequired ?? false,
      mfaEnrollReached: details.mfaEnrollReached ?? false,
    });

    if (sessionError || !sessionData.session) {
      reportPreflight({ preflightStage: sessionError ? "get-session-failed" : "browser-session-missing", userPresent: false, reauthRequired: true });
      setBusy(false);
      setReauthRequired(true);
      setMessage({ kind: "error", text: "Your session needs to be refreshed before setting up an authenticator." });
      return;
    }

    let { data: userData, error: userError } = await supabase.auth.getUser();
    let refreshAttempted = false;
    let refreshSucceeded = false;
    if (userError || !userData.user) {
      refreshAttempted = true;
      setMessage({ kind: "status", text: "Refreshing your secure session…" });
      const refreshed = await supabase.auth.refreshSession();
      refreshSucceeded = !refreshed.error && Boolean(refreshed.data.session);
      if (refreshSucceeded) ({ data: userData, error: userError } = await supabase.auth.getUser());
    }

    if (userError || !userData.user) {
      reportPreflight({ preflightStage: refreshSucceeded ? "get-user-after-refresh-failed" : "refresh-failed", userPresent: false, getUserErrorCode: userError?.code, refreshAttempted, refreshSucceeded, reauthRequired: true });
      setBusy(false);
      setReauthRequired(true);
      setMessage({ kind: "error", text: "Your session needs to be refreshed before setting up an authenticator." });
      return;
    }

    reportPreflight({ preflightStage: refreshAttempted ? "session-repaired" : "authenticated", userPresent: true, getUserErrorCode: null, refreshAttempted, refreshSucceeded });
    setMessage(null);

    const listed = await supabase.auth.mfa.listFactors();
    const all = (listed.data?.all as Factor[] | undefined) ?? [];
    const totp = all.filter((factor) => factor.factor_type === "totp");
    await snapshot("enrollment-preflight", listed.error, all);
    if (listed.error) {
      setBusy(false);
      setMessage({ kind: "error", text: "Couldn’t start authenticator setup. Please try again." });
      return;
    }
    if (totp.some((factor) => factor.status === "verified")) {
      setFactors(totp.filter((factor) => factor.status === "verified"));
      setBusy(false);
      setMessage({ kind: "error", text: "An authenticator is already configured." });
      return;
    }

    for (const pending of totp.filter((factor) => factor.status === "unverified")) {
      const cleanup = await supabase.auth.mfa.unenroll({ factorId: pending.id });
      if (cleanup.error) {
        await snapshot("pending-factor-cleanup", cleanup.error, all);
        setBusy(false);
        setMessage({ kind: "error", text: "This authenticator setup has expired. Start again." });
        return;
      }
    }

    const afterCleanup = await supabase.auth.mfa.listFactors();
    const remaining = ((afterCleanup.data?.all as Factor[] | undefined) ?? []).filter((factor) => factor.factor_type === "totp");
    await snapshot("pending-factor-cleanup-verified", afterCleanup.error, afterCleanup.data?.all as Factor[] | undefined);
    if (afterCleanup.error || remaining.some((factor) => factor.status === "unverified")) {
      setBusy(false);
      setMessage({ kind: "error", text: "This authenticator setup could not be reset cleanly. Refresh and try again." });
      return;
    }

    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "AudienceOwn authenticator" });
    if (debug) reportPreflight({ preflightStage: "mfa-enroll", userPresent: true, refreshAttempted, refreshSucceeded, mfaEnrollReached: true });
    setBusy(false);
    if (error) {
      diagnose({
        stage: "mfa_enroll",
        ok: false,
        errorName: error.name ?? null,
        errorCode: error.code ?? null,
        httpStatus: error.status ?? null,
        messageCategory: errorCategory(error),
        sessionPresent: true,
        userPresent: true,
        verifiedTotpCount: 0,
        unverifiedTotpCount: 0,
        mfaEnrollAttempt: attempt,
        hasFactorId: false,
        hasQrCode: false,
        hasSecret: false,
        hasUri: false,
      });
      setMessage({ kind: "error", text: "Couldn’t start authenticator setup. Please try again." });
      return;
    }
    const hasFactorId = Boolean(data?.id);
    const hasQrCode = Boolean(data?.totp?.qr_code);
    const hasSecret = Boolean(data?.totp?.secret);
    const hasUri = Boolean(data?.totp?.uri);
    diagnose({
      stage: "mfa_enroll",
      ok: hasFactorId && hasSecret && hasUri,
      errorName: null,
      errorCode: null,
      httpStatus: null,
      messageCategory: null,
      sessionPresent: true,
      userPresent: true,
      verifiedTotpCount: 0,
      unverifiedTotpCount: 1,
      mfaEnrollAttempt: attempt,
      hasFactorId,
      hasQrCode,
      hasSecret,
      hasUri,
      setupStateStored: hasFactorId && hasSecret && hasUri,
      qrRenderReached: false,
    });
    if (!hasFactorId || !hasSecret || !hasUri) {
      setMessage({ kind: "error", text: "Authenticator setup returned an incomplete response. Please try again." });
      return;
    }
    setEnrol({ id: data.id, qr: data.totp.uri, secret: data.totp.secret });
  }

  async function verify() {
    if (!supabase || !enrol || code.length !== 6 || busy) return;
    setBusy(true);
    setMessage(null);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: enrol.id });
    if (challengeError) {
      setBusy(false);
      await snapshot("challenge", challengeError);
      setMessage({ kind: "error", text: "Verification could not start. Request a new code and try again." });
      return;
    }
    const { error } = await supabase.auth.mfa.verify({ factorId: enrol.id, challengeId: challenge.id, code });
    setBusy(false);
    if (error) {
      await snapshot("verification", error);
      setMessage({ kind: "error", text: "That code was not accepted. Check the current code in your authenticator app." });
      return;
    }
    setMessage({ kind: "status", text: "Authenticator enabled." });
    setEnrol(null);
    setCode("");
    await refresh();
  }

  async function cancelEnrollment() {
    if (!supabase || !enrol || busy) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: enrol.id });
    setBusy(false);
    if (error) {
      await snapshot("enrollment-cancel", error);
      setMessage({ kind: "error", text: "This authenticator setup could not be cancelled cleanly. Refresh and try again." });
      return;
    }
    setEnrol(null);
    setCode("");
  }

  async function remove(id: string) {
    if (!supabase || busy) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    setConfirming(null);
    setMessage(error ? { kind: "error", text: "The authenticator could not be removed. Please try again." } : { kind: "status", text: "Authenticator removed." });
    if (!error) await refresh();
  }

  return <div>
    {loading ? <div role="status" className="space-y-3 animate-pulse motion-reduce:animate-none"><div className="h-24 rounded-2xl bg-white/[.05]"/><span className="sr-only">Loading authenticator status…</span></div> : factors.length > 0 ? <div className="space-y-3">{factors.map((factor) => <div key={factor.id} className="mfa-status-row"><span className="mfa-status-icon enabled"><ShieldCheck aria-hidden size={19}/></span><div className="min-w-0 flex-1"><p className="font-medium text-zinc-100">{factor.friendly_name || "Authenticator app"}</p><span className={`security-status-pill mt-2 ${factor.status === "verified" ? "enabled" : "attention"}`}>{factor.status === "verified" ? "Enabled" : "Setup incomplete"}</span></div>{confirming === factor.id ? <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirm authenticator removal"><span className="w-full text-xs text-amber-200">Remove this sign-in protection?</span><button disabled={busy} onClick={() => remove(factor.id)} className="button min-h-10 bg-red-600 text-xs text-white hover:bg-red-500">{busy ? "Removing…" : "Yes, remove"}</button><button disabled={busy} onClick={() => setConfirming(null)} className="button button-secondary min-h-10 text-xs">Cancel</button></div> : <button disabled={busy} onClick={() => setConfirming(factor.id)} className="button button-secondary min-h-10 text-xs">Remove</button>}</div>)}</div> : <div className="mfa-status-row"><span className="mfa-status-icon"><ShieldQuestion aria-hidden size={19}/></span><div className="min-w-0 flex-1"><p className="font-medium text-zinc-100">Authenticator not configured</p><p className="mt-1 text-sm text-zinc-400">No authenticator app is enrolled. Add a second layer of protection to your account.</p></div><span className="security-status-pill attention">Not set up</span></div>}
    {!loading && factors.length === 0 && !enrol && <button disabled={busy} onClick={begin} className="button button-primary mt-5 min-h-11 w-full sm:w-auto"><KeyRound aria-hidden size={16}/>{busy ? "Starting setup…" : "Set up authenticator"}</button>}
    {enrol && <div className="mt-6 rounded-xl border bg-white p-5 text-black"><p className="font-semibold">Scan this code with your authenticator app</p><QRCodeSVG className="mt-4 max-w-full" value={enrol.qr} size={180}/><details className="mt-4 text-xs"><summary className="cursor-pointer font-medium">Enter a manual setup key instead</summary><p className="mt-2 break-all rounded bg-zinc-100 p-2">{enrol.secret}</p></details><label className="mt-4 block text-sm font-medium" htmlFor="totp">6-digit code</label><input id="totp" inputMode="numeric" autoComplete="one-time-code" aria-describedby="totp-help" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 p-2 text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"/><p id="totp-help" className="mt-2 text-xs text-zinc-600">Enter the current code to finish enabling two-factor authentication.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><button disabled={busy || code.length !== 6} onClick={verify} className="button min-h-11 bg-black text-white">{busy ? "Verifying…" : "Verify and enable"}</button><button disabled={busy} onClick={cancelEnrollment} className="button min-h-11 border border-zinc-300 text-zinc-800">Cancel</button></div></div>}
    {message && <div role={message.kind === "error" ? "alert" : "status"} aria-live="polite" className={`security-info-strip mt-4 ${message.kind === "error" ? "tone-amber" : "tone-emerald"}`}>{message.kind === "error" ? <CircleAlert aria-hidden size={16}/> : <ShieldCheck aria-hidden size={16}/>}<p>{message.text}</p></div>}
    {reauthRequired && <Link href="/login?next=%2Fdashboard%2Fsettings%2Faccount" className="button button-secondary mt-3 min-h-11 w-full sm:w-auto">Re-authenticate</Link>}
    <div className="security-info-strip mt-5"><Info aria-hidden size={16}/><p>AudienceOwn does not claim recovery codes that the authentication provider does not supply.</p></div>
  </div>;
}

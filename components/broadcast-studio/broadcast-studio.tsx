"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowRight, ArrowUpRight, Ban, CalendarClock, CheckCircle2, Eye, Info, KeyRound, LoaderCircle, Megaphone, MoreHorizontal, PauseCircle, RadioTower, Save, Send, ShieldAlert, ShieldCheck, Sparkles, UserRoundX, Users, } from "lucide-react";
import { createDraft, previewCommunicationAudience, publishUpdate, scheduleUpdate, updateDraft, type NewVideoAudiencePreviewState, type UpdateActionState } from "@/app/dashboard/updates/actions";
import { getAlertAudienceCopyDefinition, getAlertComposerDefinition, getAlertCtaDefault, getIntentDefinition, type AlertComposerDefinition, type BroadcastIntent } from "@/lib/broadcast-studio";
import { combineScheduleLocalValue, formatScheduledDate, localScheduleToIso } from "@/lib/scheduling";
import type { BroadcastType } from "@/lib/updates";
import { FocusedEditor } from "./focused-editor";
import { broadcastChoices, isAccountEmergency } from "./broadcast-choices";
import type { AudienceEstimate, BroadcastValue, PlatformAccount } from "./types";
import { PlatformBrandIcon } from "@/components/dashboard/platform-brand-icon";
import { canonicalAccountConnected, resolveConnectionStatus } from "@/lib/social-providers/connection-health";
import { defaultRecoverySituation, linkedRecoveryIds as getLinkedRecoveryIds, recoveryDestinationGuidance, recoveryGuidance, recoverySituations, type RecoveryCommunicationDestination, type RecoverySituation } from "@/lib/recovery-communication";
const initialState: UpdateActionState = {};
function titleCase(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function providerDisplayName(value: string) {
    return ({ youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram", facebook: "Facebook", twitch: "Twitch", x: "X" } as Record<string, string>)[value.toLowerCase()] ?? titleCase(value);
}
function emergencyClientDebug(enabled: boolean, metadata: Record<string, unknown>) {
    if (enabled) console.info("[AUDIENCEOWN EMERGENCY CLIENT]", metadata);
}
function scheduleClientDebug(enabled: boolean, metadata: Record<string, unknown>) {
    if (enabled) console.info("[AUDIENCEOWN SCHEDULE CLIENT]", metadata);
}
function EmergencyFinalConfirmationDiagnostics({ enabled, updateId }: { enabled: boolean; updateId: string }) {
    useEffect(() => {
        emergencyClientDebug(enabled, { stage: "final_confirmation_mounted", updateId });
        return () => emergencyClientDebug(enabled, { stage: "final_confirmation_unmounted", updateId });
    }, [enabled, updateId]);
    return null;
}
export function newVideoSelectionInsight(input: {
    previewUnavailable: boolean;
    uniqueEligible?: number;
}) {
    if (input.previewUnavailable)
        return "Audience preview temporarily unavailable. Eligibility will be calculated from Recovery Pass consent when you submit send or schedule.";
    if (input.uniqueEligible === 0)
        return "No Recovery Pass followers have opted into Video alerts yet. Share your Recovery Pass to grow this audience.";
    return "Publishing-account selection provides context only and never adds recipients. AudienceOwn deduplicates eligible Recovery Pass followers before delivery.";
}
export function initializeAlertComposerValues(alertType: BroadcastIntent, draft?: Pick<BroadcastValue, "title" | "subject" | "preview_text" | "content" | "cta_label" | "cta_url">) {
    if (draft)
        return {
            title: draft.title,
            subject: draft.subject,
            previewText: draft.preview_text,
            message: draft.content,
            ctaLabel: draft.cta_label ?? "",
            destination: draft.cta_url ?? "",
        };
    return {
        title: "",
        subject: "",
        previewText: "",
        message: "",
        ctaLabel: getAlertCtaDefault(alertType) ?? "",
        destination: "",
    };
}
export function ZeroAudienceSendResult({ heading = "No followers are currently opted in to receive video updates.", message = "Your draft is saved and nothing was sent." }: {
    heading?: string;
    message?: string;
} = {}) {
    return <section className="studio-focus-note is-warning new-video-zero-audience-result" role="status" aria-live="polite">
    <AlertTriangle /><div><strong>{heading}</strong><p>{message}</p></div>
  </section>;
}
function EmergencySendResult({ result }: { result: NonNullable<UpdateActionState["result"]> }) {
    const sent = result.kind === "sent";
    return <section className={`studio-focus-note ${sent ? "is-success" : "is-warning"} emergency-send-result`} role={sent ? "status" : "alert"} aria-live="polite">
      {sent ? <CheckCircle2 /> : <AlertTriangle />}<div><strong>{result.heading}</strong><p>{result.message}</p>{sent && Boolean(result.destinationLabels?.length) && <div><small>Selected destinations</small>{result.destinationLabels?.map(label => <p key={label}>{label}</p>)}</div>}{sent && result.byTransport && <div className="emergency-channel-breakdown"><strong>Delivery</strong><span>Email <b>{result.byTransport.email.toLocaleString()}</b></span><span>SMS <b>{result.byTransport.sms.toLocaleString()}</b></span><span>WhatsApp <b>{result.byTransport.whatsapp.toLocaleString()}</b></span><span>Browser <b>{result.byTransport.browser_notification.toLocaleString()}</b></span><small>Channel delivery counts are separate from the unique follower total.</small></div>}</div>
    </section>;
}
export function AlertAudienceInsight({ alertType, eligibleCount, selectedContextCount }: {
    alertType: BroadcastIntent;
    eligibleCount: number | null;
    selectedContextCount: number;
}) {
    const copy = getAlertAudienceCopyDefinition(alertType);
    const countCopy = eligibleCount === null
        ? `Confirming the eligible Recovery Pass audience for this ${copy.recipientNoun}.`
        : eligibleCount === 0
            ? copy.zeroInsight
            : `${eligibleCount.toLocaleString()} Recovery Pass ${eligibleCount === 1 ? "follower is" : "followers are"} currently eligible to receive this ${copy.recipientNoun}.`;
    return <aside className="new-video-insight"><Sparkles /><div><strong>Audience insight</strong><p>{countCopy}{selectedContextCount > 0 && copy.selectedContextCopy ? ` ${copy.selectedContextCopy}` : ""}</p></div></aside>;
}
export function AlertMessagePreview({ composer, title, subject, previewText, message, buttonLabel, destinationUrl, recoveryDestinations = [] }: {
    composer: AlertComposerDefinition;
    title: string;
    subject: string;
    previewText: string;
    message: string;
    buttonLabel: string;
    destinationUrl: string;
    recoveryDestinations?: RecoveryCommunicationDestination[];
}) {
    const secureDestination = (() => { try {
        return new URL(destinationUrl).protocol === "https:";
    }
    catch {
        return false;
    } })();
    const preferenceBased = composer.audienceLabel !== "Mandatory Recovery Pass";
    const audienceCopy = getAlertAudienceCopyDefinition(composer.intent);
    return <article className="new-video-message-preview">
    <header><span>AO</span><div><strong>AudienceOwn update</strong><small>{audienceCopy.preferenceLabel} · Recovery Pass</small></div></header>
    {subject && <p className="alert-preview-subject">{subject}</p>}
    {previewText && <p className="alert-preview-preheader">{previewText}</p>}
    <h3>{title}</h3>
    <div className="new-video-message-body">{message}</div>
    {recoveryDestinations.length ? <div className="alert-preview-recovery-destinations"><strong>{buttonLabel || "Find me safely here"}</strong>{recoveryDestinations.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"><PlatformBrandIcon provider={item.provider} label={item.provider} size="sm"/>{providerDisplayName(item.provider)} · {item.displayName}<ArrowUpRight aria-hidden/></a>)}</div> : secureDestination && buttonLabel && <a href={destinationUrl} target="_blank" rel="noopener noreferrer" aria-label={`${buttonLabel} — open destination in a new tab`}>{buttonLabel}<ArrowUpRight aria-hidden/></a>}
    <footer><span>{preferenceBased ? "Preference-based update" : "Recovery communication"}</span><span>Delivered by AudienceOwn</span></footer>
  </article>;
}
function destinationProvider(destination: string, accounts: PlatformAccount[]) {
    try {
        const host = new URL(destination).hostname.toLowerCase().replace(/^www\./, "");
        if (host === "youtu.be" || host.endsWith("youtube.com"))
            return "youtube";
        if (host.endsWith("tiktok.com"))
            return "tiktok";
        if (host.endsWith("instagram.com"))
            return "instagram";
        if (host.endsWith("facebook.com") || host === "fb.watch")
            return "facebook";
        if (host.endsWith("twitch.tv"))
            return "twitch";
    }
    catch { /* The existing HTTPS contract controls link availability. */ }
    return accounts[0]?.platform ?? "video";
}
function displayDestination(destination: string) {
    try {
        const url = new URL(destination);
        return `${url.hostname.replace(/^www\./, "")}${url.pathname}${url.search}`;
    }
    catch {
        return destination;
    }
}
export function CommunicationReviewContent({ composer, accounts, audience, audienceAccounts = [], channelBreakdown, title, subject, previewText, message, destination, ctaLabel, recoveryDestinations = [] }: {
    composer: AlertComposerDefinition;
    accounts: PlatformAccount[];
    audience: number | null;
    audienceAccounts?: NonNullable<NewVideoAudiencePreviewState["emergencyAccounts"]>;
    channelBreakdown?: NewVideoAudiencePreviewState["channelBreakdown"];
    title: string;
    subject: string;
    previewText: string;
    message: string;
    destination: string;
    ctaLabel: string;
    recoveryDestinations?: RecoveryCommunicationDestination[];
}) {
    const secureDestination = (() => { try {
        return new URL(destination).protocol === "https:";
    }
    catch {
        return false;
    } })();
    const provider = destinationProvider(destination, accounts);
    const providerLabel = providerDisplayName(provider);
    const zeroAudience = audience === 0;
    const preferenceBased = composer.audienceLabel !== "Mandatory Recovery Pass";
    const audienceCopy = getAlertAudienceCopyDefinition(composer.intent);
    return <div className={`new-video-review alert-${composer.accent}`}>
    <div className={`new-video-review-top ${accounts.length ? "" : "is-audience-only"}`}>
      {accounts.length > 0 && <section className="new-video-review-card review-published-card" aria-labelledby="review-published-heading">
        <p className="new-video-review-kicker" id="review-published-heading">{composer.intent === "new_video" ? "Published on" : "Related accounts"}</p>
        <div className="new-video-review-accounts">{accounts.map((account) => <article className={`new-video-review-account provider-${account.platform}`} key={account.id}>
          <PlatformBrandIcon provider={account.platform} label={account.platform} size="md"/><span><strong>{providerDisplayName(account.platform)} · {account.label}</strong><small>{account.account_type === "official" ? "MAIN" : "RECOVERY"} · {audienceAccounts.find(item => item.accountId === account.id)?.optedInFollowerCount.toLocaleString() ?? 0} eligible</small></span>
        </article>)}</div>
        <p className="new-video-review-footnote">Selected accounts provide context only. Their native followers are not delivery recipients.</p>
      </section>}
      <section className={`new-video-review-card review-audience-card ${zeroAudience ? "is-zero" : "is-ready"}`} aria-labelledby="review-audience-heading">
        <p className="new-video-review-kicker" id="review-audience-heading">Your audience</p>
        <strong className="new-video-review-count">{audience?.toLocaleString() ?? "—"}</strong>
        <p>{zeroAudience ? audienceCopy.zeroResultHeading : audience === null ? "Confirming your Recovery Pass audience…" : `Recovery Pass followers can receive this ${audienceCopy.recipientNoun}`}</p>
        <span className="new-video-review-consent"><ShieldCheck />{audienceCopy.preferenceLabel} <strong>{preferenceBased ? "Opted in" : "Recovery Pass"}</strong></span>
      </section>
    </div>

    {channelBreakdown && <section className="new-video-review-card emergency-channel-breakdown"><strong>Delivery preferences</strong><span>Email <b>{channelBreakdown.email.toLocaleString()}</b></span>{composer.audienceLabel === "Mandatory Recovery Pass" && <><span>SMS <b>{channelBreakdown.sms.toLocaleString()}</b></span><span>WhatsApp <b>{channelBreakdown.whatsapp.toLocaleString()}</b></span><span>Browser <b>{channelBreakdown.browser_notification.toLocaleString()}</b></span></>}</section>}

    {composer.verificationLabel && !recoveryDestinations.length && <section className={`new-video-review-card review-video-card provider-${provider}`} aria-labelledby="review-video-heading">
      <div className="new-video-review-heading"><div><p className="new-video-review-kicker">{composer.verificationLabel}</p><h3 id="review-video-heading">Make sure this is the right {composer.verificationNoun}</h3><p>Open the destination before sending to confirm your followers will land in the right place.</p></div></div>
      <div className="new-video-destination-tile"><span className="new-video-destination-provider"><PlatformBrandIcon provider={provider} label={providerLabel} size="md"/></span><div><small>{providerLabel} destination</small><strong>{displayDestination(destination)}</strong></div>
        {secureDestination && <a href={destination} target="_blank" rel="noopener noreferrer" className="new-video-open-link" aria-label={`Open ${providerLabel} ${composer.verificationNoun} in a new tab`}>Open {composer.verificationNoun} <ArrowUpRight aria-hidden/></a>}
      </div>
      {!secureDestination && <p className="new-video-invalid-destination"><AlertTriangle />Add a valid HTTPS destination before sending.</p>}
    </section>}
    {recoveryDestinations.length > 0 && <section className="new-video-review-card review-video-card" aria-labelledby="review-recovery-destinations-heading"><div className="new-video-review-heading"><div><p className="new-video-review-kicker">Trusted Recovery destinations</p><h3 id="review-recovery-destinations-heading">{recoveryDestinations.length} selected</h3></div></div>{recoveryDestinations.map((item) => <div className={`new-video-destination-tile provider-${item.provider}`} key={item.id}><span className="new-video-destination-provider"><PlatformBrandIcon provider={item.provider} label={item.provider} size="md"/></span><div><small>{providerDisplayName(item.provider)} Recovery account</small><strong>{item.displayName}</strong></div><a href={item.url} target="_blank" rel="noopener noreferrer" className="new-video-open-link">Open {providerDisplayName(item.provider)} <ArrowUpRight aria-hidden/></a></div>)}</section>}

     <section className="new-video-review-card review-message-shell" aria-labelledby="review-message-heading">
       <p className="new-video-review-kicker" id="review-message-heading">Message preview</p>
       <AlertMessagePreview composer={composer} title={title} subject={subject} previewText={previewText} message={message} buttonLabel={ctaLabel} destinationUrl={destination} recoveryDestinations={recoveryDestinations}/>
    </section>

    <section className={`new-video-review-card review-ready-card ${zeroAudience ? "is-zero" : "is-ready"}`} aria-labelledby="review-ready-heading"><span>{zeroAudience ? <AlertTriangle /> : <Send />}</span><div><p className="new-video-review-kicker">{zeroAudience ? "Audience needed" : "Ready to send"}</p><h3 id="review-ready-heading">{zeroAudience ? "Your draft is safe" : "Send now"}</h3><p>{zeroAudience ? "This update cannot be sent or scheduled until at least one follower is opted in. It will remain a draft." : "Delivery begins only after your confirmation."}</p></div></section>
  </div>;
}
export function NewVideoReviewContent(props: Omit<React.ComponentProps<typeof CommunicationReviewContent>, "composer">) {
    return <CommunicationReviewContent composer={getAlertComposerDefinition("new_video")} {...props}/>;
}
export function AlertComposer({ update, initialReview = false, initialBroadcastType: _initialBroadcastType = "new_content", initialEntryIntent = "update", creator, accounts, recoveryRelationships = [], accountsAvailable = true, estimate, debugEmergencySend = false }: {
    update?: BroadcastValue;
    initialBroadcastType?: BroadcastType;
    initialReview?: boolean;
    initialEntryIntent?: "update" | "emergency";
    creator: {
        displayName: string;
        publicSlug: string;
    };
    recoveryRelationships?: {
        main_connected_account_id: string;
        recovery_connected_account_id: string;
    }[];
    accounts: PlatformAccount[];
    accountsAvailable?: boolean;
    estimate: AudienceEstimate | null;
    debugEmergencySend?: boolean;
}) {
    void _initialBroadcastType;
    const initialValues = initializeAlertComposerValues(update?.broadcast_intent ?? "account_hacked", update);
    const [intent, setIntent] = useState<BroadcastIntent>(update?.broadcast_intent ?? "account_hacked");
    const [formOpen, setFormOpen] = useState(Boolean(update));
    const [platformId, setPlatformId] = useState(update?.affected_platform_connection_id ?? "");
    const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(update?.publishing_account_ids ?? []);
    const [selectedRecoveryIds, setSelectedRecoveryIds] = useState<string[]>(() => update?.recovery_destination_ids?.length ? update.recovery_destination_ids : accounts.filter((account) => account.account_type === "backup" && account.url === update?.cta_url).slice(0, 1).map((account) => account.id));
    const [recoverySituation, setRecoverySituation] = useState<RecoverySituation>(() => update?.recovery_situation ?? defaultRecoverySituation(update?.broadcast_intent ?? "account_inaccessible"));
    const [audiencePreview, setAudiencePreview] = useState<NewVideoAudiencePreviewState>({});
    const [audiencePending, setAudiencePending] = useState(false);
    const [title, setTitle] = useState(initialValues.title);
    const [subject, setSubject] = useState(initialValues.subject);
    const [previewText, setPreviewText] = useState(initialValues.previewText);
    const [body, setBody] = useState(initialValues.message);
    const [ctaLabel, setCtaLabel] = useState(initialValues.ctaLabel);
    const [ctaUrl, setCtaUrl] = useState(initialValues.destination);
    const [dirty, setDirty] = useState(false);
    const [submissionMode, setSubmissionMode] = useState<"save" | "review" | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(initialReview);
    const [finalConfirmOpen, setFinalConfirmOpen] = useState(false);
    const [deliveryMode, setDeliveryMode] = useState<"publish" | "schedule">("publish");
    const [scheduleDate, setScheduleDate] = useState("");
    const [scheduleTime, setScheduleTime] = useState("");
    const [actionStateIntent, setActionStateIntent] = useState<BroadcastIntent | null>(update?.broadcast_intent ?? null);
    const [timeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    const openerRef = useRef<HTMLButtonElement | null>(null);
    const updateSectionRef = useRef<HTMLElement | null>(null);
    const emergencySectionRef = useRef<HTMLElement | null>(null);
    const messageSectionRef = useRef<HTMLElement | null>(null);
    const reviewSubmissionRef = useRef(false);
    const definition = getIntentDefinition(intent);
    const composer = getAlertComposerDefinition(intent);
    const saveFn = update ? updateDraft.bind(null, update.id) : createDraft;
    const publishFn = update ? publishUpdate.bind(null, update.id) : createDraft;
    const scheduleFn = update ? scheduleUpdate.bind(null, update.id) : createDraft;
    const [saveState, saveAction, savePending] = useActionState(saveFn, initialState);
    const [publishState, publishAction, publishPending] = useActionState(publishFn, initialState);
    const [scheduleState, scheduleAction, schedulePending] = useActionState(scheduleFn, initialState);
    const actionStateCurrent = actionStateIntent === intent;
    const state = actionStateCurrent ? scheduleState.error ? scheduleState : publishState.error ? publishState : saveState : initialState;
    const committing = publishPending || schedulePending;
    const zeroAudienceState = [publishState.result, scheduleState.result].find((result) => result?.kind === "zero_audience" && result.intent === intent);
    const emergencyPublishResult = definition.mandatory && publishState.result?.intent === intent ? publishState.result : undefined;
    const finalResult = emergencyPublishResult?.kind === "sent" || emergencyPublishResult?.kind === "error" ? emergencyPublishResult : zeroAudienceState;
    const finalResultVisible = Boolean(finalResult);
    useEffect(() => {
        if (!definition.mandatory || !update) return;
        emergencyClientDebug(debugEmergencySend, { stage: "publish_state_changed", updateId: update.id, publishPending, resultPresent: Boolean(publishState.result), resultKind: publishState.result?.kind ?? null, hasError: Boolean(publishState.error) });
    }, [debugEmergencySend, definition.mandatory, publishPending, publishState.error, publishState.result, update]);
    useEffect(() => {
        if (!definition.mandatory || !update || !finalConfirmOpen) return;
        emergencyClientDebug(debugEmergencySend, { stage: "result_renderer", updateId: update.id, resultKind: emergencyPublishResult?.kind ?? null });
    }, [debugEmergencySend, definition.mandatory, emergencyPublishResult?.kind, finalConfirmOpen, update]);
    const scheduledLocal = combineScheduleLocalValue(scheduleDate, scheduleTime);
    const scheduledIso = localScheduleToIso(scheduledLocal);
    useEffect(() => {
        if (!update) return;
        scheduleClientDebug(debugEmergencySend, { stage: "schedule_state_changed", updateId: update.id, pending: schedulePending, resultKind: scheduleState.result?.kind ?? null, hasError: Boolean(scheduleState.error), scheduledFor: scheduledIso || null });
    }, [debugEmergencySend, schedulePending, scheduleState.error, scheduleState.result, scheduledIso, update]);
    const scheduleLabel = composer.scheduleLabel;
    const officialAccounts = accounts.filter((account) => account.account_type === "official");
    const recoveryAccounts = accounts.filter((account) => account.account_type === "backup");
    const selected = accounts.find((account) => account.id === platformId);
    const linkedRecoveryAccountIds = getLinkedRecoveryIds(platformId, recoveryRelationships);
    const linkedRecoveries = accounts.filter(account => account.account_type === "backup" && linkedRecoveryAccountIds.has(account.id));
    const selectedRecoveries = linkedRecoveries.filter((account) => selectedRecoveryIds.includes(account.id));
    const recoveryDestinationModels = selectedRecoveries.map((account) => ({ id: account.id, provider: account.platform, displayName: account.label, url: account.url }));
    const isEmergencyFamily = isAccountEmergency(intent);
    const previewEstimate = !audiencePreview.error && audiencePreview.uniqueEligible !== undefined
        ? audiencePreview.uniqueEligible
        : null;
    const realEstimate = update && !dirty ? estimate : null;
    const persistedAudienceLabel = realEstimate?.eligible.toLocaleString();
    const estimatedAudienceLabel = previewEstimate?.toLocaleString() ?? persistedAudienceLabel;
    const insightAudience = previewEstimate ?? realEstimate?.eligible ?? null;
    const selectedContextCount = definition.platform === "optional" ? selectedAccountIds.length : platformId ? 1 : 0;
    const audienceCopy = getAlertAudienceCopyDefinition(intent);
    const secureDestination = (() => { try {
        return new URL(ctaUrl).protocol === "https:";
    }
    catch {
        return false;
    } })();
    const destinationComplete = composer.destinationMode !== "required" || secureDestination;
    const complete = intent === "new_video"
        ? Boolean(selectedAccountIds.length && title.trim() && body.trim() && destinationComplete)
        : Boolean(title.trim() && subject.trim() && body.trim() && destinationComplete && (definition.platform !== "required" || platformId) && (!definition.mandatory || selectedRecoveryIds.length));
    const reviewDisabled = savePending;
    const reviewDisabledReason = !complete ? "Incomplete fields will be explained after submission" : "";
    function change(callback: () => void) { callback(); setDirty(true); }
    function openChoice(next: BroadcastIntent, button: HTMLButtonElement) {
        openerRef.current = button;
        const persistedDraft = update?.broadcast_intent === next ? update : undefined;
        const nextValues = initializeAlertComposerValues(next, persistedDraft);
        setIntent(next);
        setPlatformId(persistedDraft?.affected_platform_connection_id ?? "");
        setSelectedAccountIds(persistedDraft?.publishing_account_ids ?? []);
        setSelectedRecoveryIds(persistedDraft?.recovery_destination_ids?.length ? persistedDraft.recovery_destination_ids : accounts.filter((account) => account.account_type === "backup" && account.url === persistedDraft?.cta_url).slice(0, 1).map((account) => account.id));
        setRecoverySituation(persistedDraft?.recovery_situation ?? defaultRecoverySituation(next));
        setTitle(nextValues.title);
        setSubject(nextValues.subject);
        setPreviewText(nextValues.previewText);
        setBody(nextValues.message);
        setCtaLabel(nextValues.ctaLabel);
        setCtaUrl(nextValues.destination);
        setAudiencePreview({});
        setActionStateIntent(null);
        setDeliveryMode("publish");
        setScheduleDate("");
        setScheduleTime("");
        setConfirmOpen(false);
        setFinalConfirmOpen(false);
        setDirty(false);
        setSubmissionMode(null);
        reviewSubmissionRef.current = false;
        setFormOpen(true);
    }
    function closeForm() {
        setFormOpen(false);
        requestAnimationFrame(() => openerRef.current?.focus());
    }
    function focusSection(entry: "update" | "emergency", focusCard = false) {
        const section = entry === "emergency" ? emergencySectionRef.current : updateSectionRef.current;
        section?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
        (focusCard ? section?.querySelector<HTMLButtonElement>(".broadcast-choice-card") : section)?.focus({ preventScroll: true });
    }
    useEffect(() => { focusSection(initialEntryIntent); }, [initialEntryIntent]);
    useEffect(() => { if (saveState.error)
        reviewSubmissionRef.current = false; }, [saveState.error]);
    useEffect(() => {
        let active = true;
        const timer = window.setTimeout(() => {
            setAudiencePending(true);
            const scopedAccountIds = definition.mandatory ? [platformId, ...selectedRecoveryIds].filter(Boolean) : selectedAccountIds;
            if (definition.mandatory && !platformId) {
                setAudiencePreview({});
                setAudiencePending(false);
                return;
            }
            previewCommunicationAudience(intent, scopedAccountIds).then((result) => { if (active)
                setAudiencePreview(result); }).finally(() => { if (active)
                setAudiencePending(false); });
        }, 180);
        return () => { active = false; window.clearTimeout(timer); };
    }, [definition.mandatory, intent, platformId, selectedAccountIds, selectedRecoveryIds]);
    function accountContextCard(account: PlatformAccount) {
        const checked = selectedAccountIds.includes(account.id), main = account.account_type === "official", connected = canonicalAccountConnected({ health: account.connection_health, providerStatus: account.provider_status, hasPublicUrl: Boolean(account.url), hasExternalAccountId: Boolean(account.external_account_id) }), connection = resolveConnectionStatus({ health: account.connection_health, providerStatus: account.provider_status, canonicalConnected: connected }), unusable = !connected || connection.actionRequired;
        const eligible = audiencePreview.emergencyAccounts?.find(item => item.accountId === account.id)?.optedInFollowerCount;
        return <article className={`target-account-card ${main ? "is-main" : "is-recovery"} ${checked ? "is-selected" : ""} ${unusable ? "is-unusable" : ""}`} key={account.id}>
      <button type="button" role="checkbox" aria-checked={checked} aria-describedby={`target-rule-${account.id}`} disabled={unusable && !checked} onClick={() => change(() => setSelectedAccountIds(current => checked ? current.filter(id => id !== account.id) : [...current, account.id]))}>
        <PlatformBrandIcon provider={account.platform} label={account.platform} size="md"/><span className="target-account-copy"><strong>{providerDisplayName(account.platform)} · {account.label}</strong><span className={`target-role-badge ${main ? "main" : "recovery"}`}>{main ? "Main account" : "Recovery account"}</span><small id={`target-rule-${account.id}`}>{eligible === undefined ? "Select to calculate" : `${eligible.toLocaleString()} opted in to ${audienceCopy.preferenceLabel}`}</small><em>{checked ? "Included as account context" : "Select if this update is relevant here"}</em></span>
        <span className="target-selected-indicator">{checked ? <><CheckCircle2 />Selected</> : unusable ? <><AlertTriangle />Needs attention</> : "Select"}</span>
      </button>{unusable && <Link href="/dashboard/platforms">Manage account <ArrowRight /></Link>}
    </article>;
    }
    const situationGuidance = recoveryGuidance(recoverySituation);
    const situationIcon = (key: RecoverySituation) => key === "hacked" ? <ShieldAlert /> : key === "suspended" ? <PauseCircle /> : key === "blocked" ? <Ban /> : key === "inaccessible" ? <KeyRound /> : key === "impersonated" ? <UserRoundX /> : <MoreHorizontal />;
    function recoveryDestinationSection(step: string, migration = false) {
        return <section className="broadcast-form-section recovery-destination-section"><div className="broadcast-form-section-title"><span>{step}</span><div><h3>{migration ? "Where are followers moving to?" : "Where should followers find you?"}</h3><p>Choose a trusted Recovery destination linked to this Main account.</p></div></div>
      {selected && <div className="recovery-transition"><div><small>{migration ? "MOVING FROM" : "AFFECTED ACCOUNT"}</small><strong><PlatformBrandIcon provider={selected.platform} label={selected.platform} size="sm"/>{providerDisplayName(selected.platform)} · {selected.label}</strong></div><ArrowDown /><div><small>{migration ? "MOVING TO" : "TRUSTED RECOVERY DESTINATIONS"}</small><strong>{selectedRecoveries.length ? `${selectedRecoveries.length} selected` : "Choose at least one linked account"}</strong>{selectedRecoveries.map((account) => <span key={account.id}><PlatformBrandIcon provider={account.platform} label={account.platform} size="sm"/>{providerDisplayName(account.platform)} · {account.label}</span>)}</div></div>}
      {!platformId ? <div className="target-account-empty"><p>Select a Main account to load its Recovery Network.</p></div> : linkedRecoveries.length ? <div className="target-account-grid recovery-destination-grid">{linkedRecoveries.map((account) => { const checked = selectedRecoveryIds.includes(account.id), connected = canonicalAccountConnected({ health: account.connection_health, providerStatus: account.provider_status, hasPublicUrl: Boolean(account.url), hasExternalAccountId: Boolean(account.external_account_id) }), status = resolveConnectionStatus({ health: account.connection_health, providerStatus: account.provider_status, canonicalConnected: connected }), unusable = !connected || status.actionRequired || !account.url; return <article className={`target-account-card is-recovery ${checked ? "is-selected" : ""} ${unusable ? "is-unusable" : ""}`} key={account.id}><button type="button" role="checkbox" aria-checked={checked} disabled={unusable} onClick={() => change(() => { setSelectedRecoveryIds(current => { const next = checked ? current.filter(id => id !== account.id) : [...current, account.id]; const first = linkedRecoveries.find(candidate => next.includes(candidate.id)); setCtaUrl(first?.url ?? ""); return next; }); if (!ctaLabel)
            setCtaLabel("Find me here"); })}><PlatformBrandIcon provider={account.platform} label={account.platform} size="md"/><span className="target-account-copy"><strong>{providerDisplayName(account.platform)} · {account.label}</strong><span className="target-role-badge recovery">Recovery account</span><small>{unusable ? "Needs attention" : "Connected · Verified destination"}</small></span><span className="target-selected-indicator">{checked ? <><CheckCircle2 />Selected</> : "Select destination"}</span></button></article>; })}</div> : <div className="target-account-empty"><p>No Recovery destination is linked to this Main account yet.</p><Link href="/dashboard/platforms">Add Recovery account <ArrowRight /></Link></div>}
      {!selectedRecoveryIds.length && platformId && <p className="update-field-error">Choose at least one trusted Recovery destination.</p>}
      <div className="studio-action-fields"><label><span>Button label</span><input value={ctaLabel} maxLength={60} onChange={(event) => change(() => setCtaLabel(event.target.value))} placeholder="Find me here"/></label><div><span>Verified Recovery destinations</span><strong>{selectedRecoveries.length ? `${selectedRecoveries.length} selected` : "Choose linked Recovery accounts"}</strong></div></div>
    </section>;
    }
    return <div className="broadcast-studio broadcast-choice-studio">
    <main className="broadcast-choice-page" inert={formOpen || confirmOpen ? true : undefined}>
      <header className="broadcast-choice-header">
        <div><p className="eyebrow">Create an update</p><h1>What do you need to tell your audience?</h1><p>Choose a broadcast type. AudienceOwn will guide you through the correct audience, message, and delivery process.</p></div>
        <div className="studio-identity"><span>{creator.displayName.slice(0, 1).toUpperCase()}</span><div><small>Publishing as</small><strong>{creator.displayName}</strong><p>@{creator.publicSlug}</p></div></div>
      </header>
      {(["share", "protect"] as const).map((group) => {
            const emergency = group === "protect", entry = emergency ? "emergency" : "update";
            return <section ref={emergency ? emergencySectionRef : updateSectionRef} tabIndex={-1} className={`broadcast-choice-group is-${group} ${initialEntryIntent === entry ? "is-entry-target" : ""}`} key={group} aria-labelledby={`${group}-heading`}>
        <div className="broadcast-choice-heading"><span>{emergency ? <ShieldAlert /> : <Megaphone />}</span><div><span className="broadcast-section-pill">{emergency ? "Recovery communications" : "Normal communications"}</span><h2 id={`${group}-heading`}>{emergency ? "Emergency Alerts" : "Updates"}</h2><p>{emergency ? "Reach the right followers when a platform account fails." : "Share releases, moments, and news with interested followers."}</p></div><button type="button" className="broadcast-section-action" onClick={() => focusSection(entry, true)}><strong>{emergency ? "Emergency Alert" : "Create Update"}</strong><small>{emergency ? "Start a recovery communication" : "Start a communication update"}</small></button></div>
        <div className="broadcast-choice-grid">
          {broadcastChoices.filter((choice) => choice.group === group).map((choice) => {
                    const Icon = choice.icon;
                    const isDraft = update && (choice.intent === intent || choice.intent === "account_inaccessible" && isEmergencyFamily);
                    return <button key={choice.intent} type="button" className={`broadcast-choice-card tone-${choice.tone}`} onClick={(event) => openChoice(choice.intent, event.currentTarget)}>
              <span className="broadcast-choice-icon"><Icon /></span>
              {isDraft && <span className="broadcast-draft-badge"><CheckCircle2 /> Continue draft</span>}
              <span className="broadcast-choice-copy"><strong>{choice.title}</strong><small>{choice.description}</small></span>
              <span className="broadcast-choice-delivery">{choice.delivery}</span>
              <span className="broadcast-choice-start">Start <ArrowUpRight /></span>
            </button>;
                })}
        </div>
      </section>;
        })}
      <aside className="broadcast-choice-explainer"><Info /><p><strong>Not sure which to choose?</strong> Updates are for sharing content. Emergency Alerts are for account or platform problems.</p></aside>
    </main>

    <form id="broadcast-form" action={saveAction} onSubmit={(event) => { const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null; if (definition.mandatory && update && finalConfirmOpen && deliveryMode === "publish" && submitter?.type === "submit") emergencyClientDebug(debugEmergencySend, { stage: "send_submit", updateId: update.id, publishPending, currentResultKind: publishState.result?.kind ?? null }); if (submitter?.name !== "continue_to_review")
        return; if (reviewSubmissionRef.current) {
        event.preventDefault();
        return;
    } setActionStateIntent(intent); setSubmissionMode("review"); reviewSubmissionRef.current = true; }}>
      <input type="hidden" name="broadcast_intent" value={intent}/><input type="hidden" name="affected_platform_connection_id" value={platformId}/>{selectedRecoveryIds.map((id) => <input key={id} type="hidden" name="selected_recovery_account_ids" value={id}/>)}<input type="hidden" name="recovery_situation" value={recoverySituation}/>
      {selectedAccountIds.map((id) => <input key={id} type="hidden" name="selected_account_ids" value={id}/>)}
      <input type="hidden" name="title" value={title}/><input type="hidden" name="subject" value={subject}/><input type="hidden" name="preview_text" value={previewText}/>
      <input type="hidden" name="content" value={body}/><input type="hidden" name="cta_label" value={ctaLabel}/><input type="hidden" name="cta_url" value={ctaUrl}/>
      <input type="hidden" name="scheduled_date" value={scheduleDate}/><input type="hidden" name="scheduled_time" value={scheduleTime}/><input type="hidden" name="scheduled_for_local" value={scheduledLocal}/><input type="hidden" name="scheduled_for_iso" value={scheduledIso}/><input type="hidden" name="time_zone" value={timeZone}/>

      {formOpen && !confirmOpen && <FocusedEditor step="Create update" title={isEmergencyFamily ? "Account inaccessible" : definition.title} description={definition.description} onClose={closeForm} onContinue={() => { }} footer={<>
        <button type="button" className="button button-secondary" onClick={closeForm}>Cancel</button>
        <button type="submit" className={`button ${update ? "button-secondary" : "button-primary"}`} disabled={savePending || publishPending} onClick={() => { setActionStateIntent(intent); setSubmissionMode("save"); reviewSubmissionRef.current = false; }}><Save />{savePending && submissionMode === "save" ? "Saving…" : "Save draft"}</button>
        <button type="submit" name="continue_to_review" value="true" className="button button-primary" disabled={reviewDisabled} aria-disabled={reviewDisabled} title={reviewDisabledReason}><Eye />{submissionMode === "review" && savePending ? "Preparing review…" : <>Continue to review <ArrowRight /></>}</button>
      </>}>
        <div className="broadcast-form-stack">
          {isEmergencyFamily && <section className="broadcast-form-section recovery-situation-section"><div className="broadcast-form-section-title"><span>01</span><div><h3>What happened?</h3><p>Tell AudienceOwn what happened so the recovery guidance can adapt.</p></div></div>
            <div className="recovery-situation-grid" role="radiogroup" aria-label="Recovery situation">{recoverySituations.map((item) => <button type="button" role="radio" aria-checked={recoverySituation === item.key} className={recoverySituation === item.key ? "is-selected" : ""} key={item.key} onClick={() => change(() => setRecoverySituation(item.key))}>{situationIcon(item.key)}<span><strong>{item.label}</strong><small>{item.description}</small></span>{recoverySituation === item.key && <CheckCircle2 />}</button>)}</div>
          </section>}

          {definition.platform !== "none" && <section className="broadcast-form-section"><div className="broadcast-form-section-title"><span>{isEmergencyFamily ? "02" : "01"}</span><div><h3>{composer.contextHeading}</h3><p>{composer.contextCopy}</p></div></div>
            {definition.platform === "optional" ? <div className="new-video-target-groups">
              {intent !== "new_video" && <button type="button" className={`target-all-context ${selectedAccountIds.length ? "" : "is-selected"}`} onClick={() => change(() => setSelectedAccountIds([]))}><Users /><span><strong>All connected accounts</strong><small>Do not limit this update to a specific connected account.</small></span>{!selectedAccountIds.length && <CheckCircle2 />}</button>}
              <section className="target-account-family is-main" aria-labelledby="main-accounts-heading"><header><span><RadioTower /></span><div><h4 id="main-accounts-heading">Main accounts</h4><p>Account context only. Native platform followers are never recipients.</p></div></header>{officialAccounts.length ? <div className="target-account-grid">{officialAccounts.map(accountContextCard)}</div> : <div className="target-account-empty"><p>No Main accounts connected.</p><Link href="/dashboard/platforms">Add Main account <ArrowRight /></Link></div>}</section>
              {recoveryAccounts.length > 0 && <section className="target-account-family is-recovery" aria-labelledby="recovery-accounts-heading"><header><span><ShieldCheck /></span><div><h4 id="recovery-accounts-heading">Recovery accounts</h4><p>Account context only. Selecting one does not add or reassign recipients.</p></div></header><div className="target-account-grid">{recoveryAccounts.map(accountContextCard)}</div></section>}
            </div> : <div className="broadcast-platform-options">
              {officialAccounts.map((account) => { const checked = platformId === account.id; return <button type="button" key={account.id} className={checked ? "is-selected" : ""} aria-checked={checked} role="radio" onClick={() => change(() => { setPlatformId(account.id); setSelectedRecoveryIds([]); setCtaUrl(""); })}><span className="studio-platform-logo"><PlatformBrandIcon provider={account.platform} label={account.platform} size="sm"/></span><span><strong>{providerDisplayName(account.platform)} · {account.label}</strong><small>MAIN ACCOUNT · Connected</small></span>{checked && <CheckCircle2 />}</button>; })}
            </div>}
            {!accountsAvailable ? <div className="studio-focus-note is-warning" role="status"><AlertTriangle /><div><strong>Connected accounts unavailable</strong><p>Account context cannot be established right now. Try again later.</p></div></div> : definition.platform === "required" && !officialAccounts.length && <div className="studio-focus-note is-warning"><AlertTriangle /><div><strong>No Main accounts connected</strong><p>Configure a platform before continuing.</p><Link href="/dashboard/platforms">Configure platforms</Link></div></div>}
          </section>}

          {intent === "platform_migration" && recoveryDestinationSection("02", true)}

          <section className={`broadcast-form-section broadcast-audience-summary shared-alert-audience accent-${composer.accent}`} aria-live="polite"><div className="broadcast-form-section-title"><span>{definition.mandatory ? "03" : "02"}</span><div><h3>{definition.mandatory ? "Your emergency audience" : `Your ${composer.audienceLabel.toLowerCase()} audience`}</h3><p>{definition.mandatory ? "Emergency Alerts can reach followers who opted in through the selected Main and Recovery accounts." : `Selected accounts define where this update is relevant. Only Recovery Pass followers who ${audienceCopy.optInCopy} are eligible.`}</p></div></div>
            {audiencePending ? <p className="broadcast-real-count"><LoaderCircle className="animate-spin"/>Calculating Recovery Pass audience…</p> : audiencePreview.error ? <div className="studio-focus-note is-warning"><AlertTriangle /><div><strong>Audience unavailable</strong><p>{audiencePreview.error}</p></div></div> : <p className="broadcast-real-count"><Users /><strong>{audiencePreview.uniqueEligible !== undefined ? audiencePreview.uniqueEligible.toLocaleString() : realEstimate?.eligible.toLocaleString() ?? "—"}</strong> Recovery Pass followers · {audienceCopy.preferenceLabel}{!definition.mandatory && " · Opted in"}</p>}
            {audiencePreview.emergencyAccounts && <div className="emergency-account-audience"><div className="emergency-account-audience-header"><strong>{audiencePreview.emergencyAccounts.length} accounts selected</strong><span>Per-account eligibility</span></div>{audiencePreview.emergencyAccounts.map(account => <article className={`emergency-audience-account is-${account.role}`} key={account.accountId}><PlatformBrandIcon provider={account.provider} label={account.provider} size="sm"/><span><strong>{providerDisplayName(account.provider)} · {account.displayName}</strong><small>{account.role === "main" ? "MAIN ACCOUNT" : "RECOVERY ACCOUNT"}</small></span><em>{account.optedInFollowerCount.toLocaleString()} opted in to {audienceCopy.preferenceLabel}</em></article>)}<div className={`emergency-unique-total ${audiencePreview.zeroAudience ? "is-zero" : ""}`}><strong>{audiencePreview.uniqueEligible?.toLocaleString() ?? "—"}</strong><span>unique eligible followers</span><small>Deduplicated across selected accounts</small></div><p className="emergency-dedup-note">Some followers may be connected through more than one selected account. AudienceOwn automatically removes duplicates before sending.</p>{audiencePreview.channelBreakdown && <div className="emergency-channel-breakdown"><strong>Delivery preferences</strong><span>Email <b>{audiencePreview.channelBreakdown.email.toLocaleString()}</b></span>{definition.mandatory && <><span>SMS <b>{audiencePreview.channelBreakdown.sms.toLocaleString()}</b></span><span>WhatsApp <b>{audiencePreview.channelBreakdown.whatsapp.toLocaleString()}</b></span><span>Browser <b>{audiencePreview.channelBreakdown.browser_notification.toLocaleString()}</b></span></>}<small>{definition.mandatory ? "Each Recovery Pass currently selects one verified delivery method." : "Normal Updates currently deliver through verified email only."}</small></div>}{audiencePreview.zeroAudience && <div className="studio-focus-note is-warning"><AlertTriangle /><div><strong>No followers are currently opted in to receive this type of update through the selected accounts.</strong><p>Your draft is safe, but nothing can be sent yet.</p></div></div>}</div>}
            <AlertAudienceInsight alertType={intent} eligibleCount={insightAudience} selectedContextCount={selectedContextCount}/>
            <button type="button" className="button button-primary selection-continue" disabled={intent === "new_video" && !selectedAccountIds.length || definition.platform === "required" && !platformId} onClick={() => { messageSectionRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); messageSectionRef.current?.focus({ preventScroll: true }); }}>Write your update <ArrowRight /></button>
          </section>

          <section ref={messageSectionRef} tabIndex={-1} className="broadcast-form-section"><div className="broadcast-form-section-title"><span>{definition.mandatory ? "04" : "03"}</span><div><h3>{intent === "platform_migration" ? "Write the migration update" : definition.mandatory ? "Write the recovery alert" : "Write your update"}</h3><p>{intent === "platform_migration" ? "Tell followers why you're moving and where they should find you now." : definition.mandatory ? "Explain the problem clearly and tell followers what they should do next." : definition.placeholder}</p></div></div>
            {definition.mandatory && <div className={`studio-writing-guide ${intent === "platform_migration" ? "is-migration" : ""}`}><Sparkles /><div><strong>A strong {intent === "platform_migration" ? "migration update" : "recovery alert"} includes</strong><p>{intent === "platform_migration" ? "Why you're moving · where to find you · whether the old account remains active · what happens next" : situationGuidance.points.join(" · ")}</p><small>{intent === "platform_migration" ? "Keep the transition calm, clear, and grounded in the selected accounts." : situationGuidance.summary}</small></div></div>}
            <div className="broadcast-message-fields">
              <label><span>{composer.titleFieldLabel} <small>{title.length}/120</small></span><input value={title} maxLength={120} onChange={(event) => change(() => { setTitle(event.target.value); if (!composer.showSubject) {
            setSubject(event.target.value.slice(0, 160));
            setPreviewText(event.target.value.slice(0, 200));
        } })} placeholder={intent === "new_video" ? "New video is live 🎬" : "Give this update a clear title"}/></label>
              {composer.showSubject && <label className="is-prominent"><span>Subject <small>{subject.length}/160</small></span><input value={subject} maxLength={160} onChange={(event) => change(() => setSubject(event.target.value))} placeholder="A clear reason to open this update"/></label>}
              {composer.showPreviewText && <label><span>Preview text <small>{previewText.length}/200</small></span><input value={previewText} maxLength={200} onChange={(event) => change(() => setPreviewText(event.target.value))} placeholder="Add context before they open it"/></label>}
              <label><span>Message <small>{body.length.toLocaleString()}/20,000</small></span><textarea value={body} maxLength={20000} onChange={(event) => change(() => setBody(event.target.value))} placeholder={intent === "new_video" ? "I just uploaded a new video. Watch it here." : definition.placeholder}/></label>
            </div>
          </section>

          {isEmergencyFamily && recoveryDestinationSection("05")}

          {!definition.mandatory && <section className="broadcast-form-section"><div className="broadcast-form-section-title"><span>04</span><div><h3>{composer.destinationHeading}</h3><p>{composer.destinationMode === "optional" ? "Add a secure next step if this update needs one. HTTPS destinations only." : "Give followers a secure next step. HTTPS destinations only."}</p></div></div>
            <div className="studio-action-fields"><label><span>Button label</span><input value={ctaLabel} maxLength={60} onChange={(event) => change(() => setCtaLabel(event.target.value))} placeholder={composer.ctaPlaceholder}/></label><label><span>{composer.destinationLabel}</span><input type="url" value={ctaUrl} onChange={(event) => change(() => { setCtaUrl(event.target.value); if (!ctaLabel)
                setCtaLabel(composer.ctaPlaceholder); })} placeholder="https://"/></label></div>
            {secureDestination && <p className="broadcast-secure-link"><CheckCircle2 /> Secure HTTPS link</p>}
            {state.errors?.cta_url?.[0] && <p className="update-field-error">{state.errors.cta_url[0]}</p>}
          </section>}

          {state.error && <p role="alert" className="update-form-error">{state.error}</p>}
        </div>
      </FocusedEditor>}

      {confirmOpen && !finalConfirmOpen && <FocusedEditor step={definition.mandatory ? `${intent === "platform_migration" ? "05" : "06"} · ${composer.reviewTitle}` : intent === "new_video" ? "05 · Review your video alert" : "05 · Review your alert"} title={composer.reviewTitle} description="Check your message and audience before sending." onClose={() => setConfirmOpen(false)} closeDisabled={committing} onContinue={() => { }} footer={<><button type="button" className="button button-secondary" disabled={committing} onClick={() => setConfirmOpen(false)}>Back</button><button type="submit" className="button button-secondary" disabled={committing} onClick={() => setActionStateIntent(intent)}><Save />Save draft</button>{deliveryMode === "publish" ? <button type="button" className="button button-primary" disabled={committing} onClick={() => setFinalConfirmOpen(true)}><Send />{composer.sendLabel}</button> : <button type="button" className="button button-primary" disabled={committing || !scheduledIso} onClick={() => setFinalConfirmOpen(true)}><CalendarClock />Review schedule</button>}</>}>
        <div className="broadcast-confirmation">{definition.mandatory && selected && selectedRecoveries.length > 0 && <section className={`recovery-review-summary ${intent === "platform_migration" ? "is-migration" : "is-emergency"}`}><div><small>{intent === "platform_migration" ? "MOVING FROM" : "AFFECTED ACCOUNT"}</small><strong><PlatformBrandIcon provider={selected.platform} label={selected.platform} size="md"/>{providerDisplayName(selected.platform)} · {selected.label}</strong></div><ArrowRight className="recovery-review-arrow"/><div><small>{intent === "platform_migration" ? "MOVING TO" : "TRUSTED RECOVERY DESTINATIONS"}</small><strong>{selectedRecoveries.length} selected</strong>{selectedRecoveries.map((account) => <span key={account.id}><PlatformBrandIcon provider={account.platform} label={account.platform} size="md"/>{providerDisplayName(account.platform)} · {account.label}</span>)}</div>{isEmergencyFamily && <div className="recovery-review-situation"><small>SITUATION</small><strong>{recoverySituations.find((item) => item.key === recoverySituation)?.label}</strong></div>}</section>}{definition.mandatory && audiencePreview.emergencyAccounts && <section className="emergency-account-audience"><div className="emergency-account-audience-header"><strong>EMERGENCY AUDIENCE</strong><span>{audiencePreview.uniqueEligible?.toLocaleString()} unique followers</span></div>{audiencePreview.emergencyAccounts.map(account => <article className={`emergency-audience-account is-${account.role}`} key={account.accountId}><PlatformBrandIcon provider={account.provider} label={account.provider} size="sm"/><span><strong>{providerDisplayName(account.provider)} · {account.displayName}</strong><small>{account.role.toUpperCase()} ACCOUNT</small></span><em>{account.optedInFollowerCount.toLocaleString()} opted in</em></article>)}{audiencePreview.channelBreakdown && <div className="emergency-channel-breakdown"><strong>DELIVERY</strong><span>Email <b>{audiencePreview.channelBreakdown.email.toLocaleString()}</b></span><span>SMS <b>{audiencePreview.channelBreakdown.sms.toLocaleString()}</b></span><span>WhatsApp <b>{audiencePreview.channelBreakdown.whatsapp.toLocaleString()}</b></span><span>Browser <b>{audiencePreview.channelBreakdown.browser_notification.toLocaleString()}</b></span></div>}</section>}<p className="studio-focus-note">{definition.mandatory && recoveryDestinationGuidance(recoveryDestinationModels)}</p>
<CommunicationReviewContent composer={composer} accounts={definition.platform === "optional" ? accounts.filter((account) => selectedAccountIds.includes(account.id)) : selected ? [selected] : []} audience={previewEstimate ?? realEstimate?.eligible ?? null} audienceAccounts={audiencePreview.emergencyAccounts} channelBreakdown={audiencePreview.channelBreakdown} title={title} subject={subject} previewText={previewText} message={body} destination={ctaUrl} ctaLabel={ctaLabel} recoveryDestinations={definition.mandatory ? recoveryDestinationModels : []}/>
          <div className="studio-publish-mode" role="group" aria-label="Delivery time">
            <button type="button" className={deliveryMode === "publish" ? "is-selected" : ""} disabled={committing} onClick={() => setDeliveryMode("publish")}><Send /><span><strong>Publish now</strong><small>Send only after final confirmation</small></span></button>
            <button type="button" className={deliveryMode === "schedule" ? "is-selected" : ""} disabled={committing} onClick={() => setDeliveryMode("schedule")}><CalendarClock /><span><strong>Schedule</strong><small>Choose a future local time</small></span></button>
          </div>
          {deliveryMode === "schedule" && <section className="studio-schedule-fields">
            <label><span>Date</span><input aria-label="Schedule date" type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)}/></label>
            <label><span>Time</span><input aria-label="Schedule time" type="time" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} step="60"/></label>
            <div><small>Time zone</small><strong>{timeZone}</strong></div>
            {scheduledIso && <p>If scheduling succeeds, delivery will begin on <strong>{formatScheduledDate(scheduledIso, timeZone)}</strong>.</p>}
            {scheduleState.errors?.scheduled_for_local?.[0] && <p className="update-field-error">{scheduleState.errors.scheduled_for_local[0]}</p>}
          </section>}
          <p className="studio-focus-note">{definition.mandatory ? "Each eligible follower will receive this alert through their exact selected Recovery Pass." : `Eligible followers will receive this through verified email according to their ${audienceCopy.preferenceLabel.toLowerCase()} consent.`}</p>
        </div>
      </FocusedEditor>}

      {finalConfirmOpen && <FocusedEditor step="Final confirmation" title={finalResult?.heading ?? (deliveryMode === "publish" ? `${composer.sendLabel}?` : `${scheduleLabel}?`)} description={finalResult ? finalResult.message : definition.mandatory && previewEstimate === 0 ? "There is currently nobody eligible to receive this Emergency Alert." : estimatedAudienceLabel ? `Your ${definition.title} update will be sent to ${estimatedAudienceLabel} unique eligible recipients.` : `Your ${definition.title} update will be sent only to eligible Recovery Pass followers with the required consent.`} onClose={() => setFinalConfirmOpen(false)} closeDisabled={committing} onContinue={() => { }} footer={finalResultVisible ? <>{finalResult?.kind === "sent" ? <button type="button" className="button button-primary" onClick={() => setFinalConfirmOpen(false)}>Done</button> : <><button type="button" className="button button-secondary" onClick={() => { setFinalConfirmOpen(false); setConfirmOpen(false); }}>Back to draft</button>{creator.publicSlug && <Link href={`/c/${creator.publicSlug}`} className="button button-secondary">View Recovery Pass</Link>}</>}</> : <><button type="button" className="button button-secondary" disabled={committing} onClick={() => setFinalConfirmOpen(false)}>Cancel</button>{deliveryMode === "publish" ? <button type="submit" formAction={publishAction} className="button button-primary" disabled={committing} onClick={() => setActionStateIntent(intent)}><Send />
{publishPending ? definition.mandatory ? "Sending emergency alert…" : "Sending…" : composer.sendLabel}</button> : <button type="submit" formAction={scheduleAction} className="button button-primary" disabled={committing || !scheduledIso} onClick={() => setActionStateIntent(intent)}><CalendarClock />{schedulePending ? "Scheduling…" : scheduleLabel}</button>}</>}>
        <div className="broadcast-confirmation">{finalResult ? finalResult.kind === "zero_audience" ? <ZeroAudienceSendResult heading={finalResult.heading} message={finalResult.message}/> : <EmergencySendResult result={finalResult}/> : <>{definition.mandatory && selected && selectedRecoveries.length > 0 && <><section className="recovery-final-facts"><div><small>Affected account</small><strong>{providerDisplayName(selected.platform)} · {selected.label}</strong></div><div><small>Recovery destinations</small><strong>{selectedRecoveries.length} selected</strong>{selectedRecoveries.map(account => <span key={account.id}>{providerDisplayName(account.platform)} · {account.label}</span>)}</div></section>{audiencePreview.emergencyAccounts && <section className="emergency-account-audience"><div className="emergency-account-audience-header"><strong>Emergency audience</strong><span>Per-account eligibility</span></div>{audiencePreview.emergencyAccounts.map(account => <article className={`emergency-audience-account is-${account.role}`} key={account.accountId}><PlatformBrandIcon provider={account.provider} label={account.provider} size="sm"/><span><strong>{providerDisplayName(account.provider)} · {account.displayName}</strong><small>{account.role.toUpperCase()} ACCOUNT</small></span><em>{account.optedInFollowerCount.toLocaleString()} opted in</em></article>)}<div className={`emergency-unique-total ${audiencePreview.zeroAudience ? "is-zero" : ""}`}><strong>{audiencePreview.uniqueEligible?.toLocaleString() ?? "—"}</strong><span>unique eligible followers</span><small>Deduplicated across selected accounts</small></div>{audiencePreview.channelBreakdown && <div className="emergency-channel-breakdown"><strong>Delivery</strong><p>Followers will receive this alert through their verified communication preferences.</p><span>Email <b>{audiencePreview.channelBreakdown.email.toLocaleString()}</b></span><span>SMS <b>{audiencePreview.channelBreakdown.sms.toLocaleString()}</b></span><span>WhatsApp <b>{audiencePreview.channelBreakdown.whatsapp.toLocaleString()}</b></span><span>Browser <b>{audiencePreview.channelBreakdown.browser_notification.toLocaleString()}</b></span><small>{audiencePreview.uniqueEligible?.toLocaleString() ?? "—"} unique followers total. Channel counts are not added together.</small></div>}</section>}</>}
{deliveryMode === "schedule" && scheduledIso && <section className="studio-schedule-confirmation"><p className="new-video-review-kicker">Scheduled for</p><strong>{formatScheduledDate(scheduledIso, timeZone)}</strong><span>{timeZone}</span></section>}{scheduleState.error && <section className="studio-focus-note is-warning" role="alert"><AlertTriangle /><div><strong>{scheduleState.error}</strong>{scheduleState.errors?.scheduled_for_local?.[0] && <p>{scheduleState.errors.scheduled_for_local[0]}</p>}</div></section>}<div className="studio-focus-note"><Send /><div><strong>{definition.mandatory ? "Delivery" : `${audienceCopy.preferenceLabel} consent`}</strong><p>{definition.mandatory ? "Followers will receive this alert through their verified communication preferences." : deliveryMode === "publish" ? "Delivery begins after confirmation and cannot be recalled once sending starts." : `Delivery will begin at the scheduled local time shown above.`}</p></div></div></>}</div>
      </FocusedEditor>}
      {finalConfirmOpen && definition.mandatory && update && <EmergencyFinalConfirmationDiagnostics enabled={debugEmergencySend} updateId={update.id}/>}
    </form>
  </div>;
}
export const BroadcastStudio = AlertComposer;

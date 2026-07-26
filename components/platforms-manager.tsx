"use client";

import {
  useActionState, useEffect, useId, useMemo, useRef, useState,
} from "react";
import {
  Check, ChevronDown, Eye, EyeOff, Link2, Plus, Search, Trash2, X,
} from "lucide-react";
import { savePlatformGroup, type PlatformSaveState } from "@/app/actions/creator";
import {
  PLATFORMS, getPlatform, normalizePlatformAccount, platformFromAccount,
  searchPlatforms, type PlatformId,
} from "@/lib/platforms";

export type PlatformAccount = {
  id: string;
  platform: string;
  account_type: string;
  label: string;
  url: string;
  is_primary: boolean;
  is_public: boolean;
  position: number;
};
type DraftAccount = { id?: string; platformId: PlatformId; value: string; label?: string; isPublic: boolean };
type Draft = { official: DraftAccount; backups: DraftAccount[] };

function accountDraft(account: PlatformAccount): DraftAccount {
  return {
    id: account.id,
    platformId: platformFromAccount(account.platform, account.url).id,
    value: account.url,
    label: account.label,
    isPublic: account.is_public,
  };
}

function PlatformSelect({
  value, onChange, label, connected,
}: {
  value: PlatformId;
  onChange: (value: PlatformId) => void;
  label: string;
  connected: Set<PlatformId>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selected = getPlatform(value)!;
  const SelectedIcon = selected.icon;
  const options = searchPlatforms(query);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return <div className="platform-select" ref={rootRef}>
    <span className="label">{label}</span>
    <button type="button" className="platform-select-trigger" onClick={() => setOpen((current) => !current)}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}>
      <span className="platform-brand-icon" style={{ color:selected.brandColor, background:selected.brandBackground }}><SelectedIcon size={20}/></span>
      <span><strong>{selected.name}</strong><small>{selected.description}</small></span>
      <ChevronDown size={17}/>
    </button>
    {open && <div className="platform-select-popover">
      <label className="platform-select-search"><Search size={15}/><span className="sr-only">Filter platforms</span>
        <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); } }}
          placeholder="Find a platform"/>
      </label>
      <div role="listbox" id={listId} aria-label={label}>
        {options.map((platform) => {
          const Icon = platform.icon;
          return <button key={platform.id} type="button" role="option" aria-selected={platform.id === value}
            onClick={() => { onChange(platform.id); setOpen(false); setQuery(""); }}>
            <span className="platform-brand-icon" style={{ color:platform.brandColor, background:platform.brandBackground }}><Icon size={18}/></span>
            <span><strong>{platform.name}</strong><small>{platform.category}</small></span>
            {connected.has(platform.id) && <i>Connected</i>}
            {platform.id === value && <Check size={16}/>}
          </button>;
        })}
      </div>
    </div>}
  </div>;
}

function AccountPreview({ account }: { account: DraftAccount }) {
  if (!account.value.trim()) return null;
  const platform = getPlatform(account.platformId)!;
  const normalized = normalizePlatformAccount(account.platformId, account.value);
  if ("error" in normalized) return <p className="account-inline-error" role="status">{normalized.error}</p>;
  const Icon = platform.icon;
  let shortUrl = normalized.url;
  try { const url = new URL(normalized.url); shortUrl = `${url.hostname.replace(/^www\./, "")}${url.pathname}`; } catch {}
  return <div className="account-preview">
    <span className="platform-brand-icon" style={{ color:platform.brandColor, background:platform.brandBackground }}><Icon size={17}/></span>
    <span><strong>{normalized.label}</strong><small>{shortUrl}</small></span>
    <i>{platform.name}</i>
  </div>;
}

export function PlatformsManager({ accounts }: { accounts: PlatformAccount[] }) {
  const official = accounts.find((account) => account.account_type === "official" && account.is_primary)
    ?? accounts.find((account) => account.account_type === "official");
  const savedBackups = useMemo(() => accounts.filter((account) => account.account_type === "backup")
    .sort((a, b) => a.position - b.position), [accounts]);
  const connected = useMemo(() => new Set(accounts.map((account) => platformFromAccount(account.platform, account.url).id)), [accounts]);
  const [selected, setSelected] = useState<PlatformId | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState("");
  const [dirty, setDirty] = useState(false);
  const [state, action, pending] = useActionState<PlatformSaveState, FormData>(savePlatformGroup, {});
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const filteredPlatforms = searchPlatforms(query);

  function openEditor(platformId: PlatformId, trigger?: HTMLElement) {
    returnFocusRef.current = trigger ?? null;
    setSelected(platformId);
    setDraft({
      official: official ? accountDraft(official) : { platformId, value:"", isPublic:true },
      backups: savedBackups.map(accountDraft),
    });
    setDirty(false);
  }

  function requestClose() {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    setSelected(null);
    setDraft(null);
    setDirty(false);
    requestAnimationFrame(() => returnFocusRef.current?.focus());
  }

  function updateDraft(recipe: (current: Draft) => Draft) {
    setDraft((current) => current ? recipe(current) : current);
    setDirty(true);
  }

  useEffect(() => {
    if (!selected) return;
    const dialog = dialogRef.current;
    const focusables = () => [...(dialog?.querySelectorAll<HTMLElement>("button:not([disabled]),input:not([disabled])") ?? [])];
    focusables()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (dirty && !window.confirm("Discard your unsaved changes?")) return;
        setSelected(null);
        setDraft(null);
        setDirty(false);
        requestAnimationFrame(() => returnFocusRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0]; const last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selected, dirty]);

  const payload = draft ? JSON.stringify(draft) : "";
  const editorPlatform = draft ? getPlatform(draft.official.platformId)! : null;
  const EditorIcon = editorPlatform?.icon;

  return <div className="platforms-workspace">
    <section className="platform-library" aria-labelledby="platform-library-title">
      <div className="platform-library-heading">
        <div><p className="eyebrow">Platform library</p><h2 id="platform-library-title">Choose where you show up</h2></div>
        <p>{PLATFORMS.length} supported destinations</p>
      </div>
      <label className="platform-search">
        <Search size={20}/><span className="sr-only">Search platforms</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search platforms"/>
        {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><X size={16}/></button>}
      </label>
      <div className="platform-selector-grid">
        {filteredPlatforms.map((platform) => {
          const Icon = platform.icon;
          const isConnected = connected.has(platform.id);
          return <button key={platform.id} type="button" className="platform-option"
            onClick={(event) => openEditor(platform.id, event.currentTarget)}>
            <span className="platform-card-glow" style={{ background:platform.brandColor }}/>
            <span className="platform-brand-icon" style={{ color:platform.brandColor, background:platform.brandBackground }}><Icon size={29}/></span>
            <span className="platform-card-copy"><strong>{platform.name}</strong><small>{platform.description}</small></span>
            {isConnected && <span className="platform-connected-badge"><Check size={12}/> Connected</span>}
          </button>;
        })}
      </div>
      {!filteredPlatforms.length && <div className="platform-no-results"><Search size={24}/><p>No platforms match “{query}”.</p><button type="button" onClick={() => setQuery("")}>Clear search</button></div>}
    </section>

    <section className="connected-platforms" aria-labelledby="connected-platforms-title">
      <div className="connected-platforms-heading"><div><p className="eyebrow">Connected</p><h2 id="connected-platforms-title">Your platforms</h2></div>
        <button type="button" className="button button-secondary" onClick={(event) => openEditor(official ? platformFromAccount(official.platform, official.url).id : "youtube", event.currentTarget)}><Plus size={16}/> Add account</button>
      </div>
      {official ? <div className="connected-card">
        {(() => { const platform = platformFromAccount(official.platform, official.url); const Icon = platform.icon; return <>
          <span className="platform-brand-icon connected-card-icon" style={{ color:platform.brandColor, background:platform.brandBackground }}><Icon size={25}/></span>
          <span className="connected-card-copy"><strong>{platform.name}</strong><small>{official.label || official.url}</small></span>
          <span className="connected-card-status"><i>Official</i><i>{official.is_public ? <Eye size={12}/> : <EyeOff size={12}/>} {official.is_public ? "Public" : "Private"}</i></span>
          {!!savedBackups.length && <span className="backup-icon-stack" aria-label={`${savedBackups.length} backup accounts`}>
            {savedBackups.slice(0, 4).map((backup) => { const item = platformFromAccount(backup.platform, backup.url); const BackupIcon = item.icon; return <i key={backup.id} style={{ color:item.brandColor, background:item.brandBackground }}><BackupIcon size={13}/></i>; })}
            <small>{savedBackups.length} {savedBackups.length === 1 ? "backup" : "backups"}</small>
          </span>}
          <button type="button" className="connected-edit" onClick={(event) => openEditor(platform.id, event.currentTarget)}>Edit</button>
        </>; })()}
      </div> : <div className="connected-empty"><span><Link2 size={20}/></span><div><strong>No platforms connected yet</strong><p>Choose a platform above to add your official account.</p></div></div>}
    </section>

    {selected && draft && editorPlatform && EditorIcon && <div className="platform-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) requestClose();
    }}>
      <div ref={dialogRef} className="platform-modal" role="dialog" aria-modal="true" aria-labelledby="platform-editor-title">
        <form action={action} onSubmit={() => setDirty(false)}>
          <input type="hidden" name="payload" value={payload}/>
          <header className="platform-editor-header">
            <div><span className="platform-brand-icon" style={{ color:editorPlatform.brandColor, background:editorPlatform.brandBackground }}><EditorIcon size={24}/></span>
              <div><h2 id="platform-editor-title">Configure accounts</h2><p>{editorPlatform.name} and your backup destinations</p></div></div>
            <button type="button" aria-label="Close account editor" onClick={requestClose}><X size={20}/></button>
          </header>
          <div className="platform-modal-body">
            <section className="account-editor-card">
              <div className="account-section-heading"><div><p className="account-step">Main account</p><h3>Your official destination <span>Required</span></h3><p>This is the primary account fans should trust.</p></div></div>
              <PlatformSelect label="Main platform" value={draft.official.platformId} connected={connected}
                onChange={(platformId) => updateDraft((value) => ({ ...value, official:{ ...value.official, platformId, value:"" } }))}/>
              <label className="label" htmlFor="official-account">Account URL or handle</label>
              <div className={`platform-url-input ${state.fieldErrors?.official ? "has-error" : ""}`}><Link2 size={17}/><input id="official-account" value={draft.official.value}
                onChange={(event) => updateDraft((value) => ({ ...value, official:{ ...value.official, value:event.target.value } }))}
                placeholder={editorPlatform.placeholder} autoComplete="url" required/></div>
              <p className="field-helper">{editorPlatform.handleBaseUrl ? "Paste a secure URL or enter an @handle—we’ll format it for you." : `Use a full HTTPS URL for ${editorPlatform.name}.`}</p>
              {state.fieldErrors?.official && <p className="field-error" role="alert">{state.fieldErrors.official}</p>}
              <AccountPreview account={draft.official}/>
              <VisibilityToggle checked={draft.official.isPublic} onChange={(isPublic) => updateDraft((value) => ({ ...value, official:{ ...value.official, isPublic } }))}/>
            </section>

            <section className="account-editor-card backup-section">
              <div className="account-section-heading"><div><p className="account-step">Backup accounts</p><h3>Keep another route open <span className="optional">Optional</span></h3><p>Each backup can use a completely different platform.</p></div></div>
              <div className="backup-list">{draft.backups.map((backup, index) => {
                const backupPlatform = getPlatform(backup.platformId)!;
                return <article className="backup-account" key={backup.id ?? `new-${index}`}>
                  <div className="backup-title"><span>Backup account {index + 1}</span><button type="button" aria-label={`Remove backup account ${index + 1}`}
                    onClick={() => updateDraft((value) => ({ ...value, backups:value.backups.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={16}/> <span>Remove</span></button></div>
                  <PlatformSelect label="Platform" value={backup.platformId} connected={connected}
                    onChange={(platformId) => updateDraft((value) => ({ ...value, backups:value.backups.map((item, itemIndex) => itemIndex === index ? { ...item, platformId, value:"" } : item) }))}/>
                  <label className="label" htmlFor={`backup-url-${index}`}>URL or handle</label>
                  <div className={`platform-url-input ${state.fieldErrors?.[`backup-${index}`] ? "has-error" : ""}`}><Link2 size={16}/><input id={`backup-url-${index}`} value={backup.value}
                    onChange={(event) => updateDraft((value) => ({ ...value, backups:value.backups.map((item, itemIndex) => itemIndex === index ? { ...item, value:event.target.value } : item) }))}
                    placeholder={backupPlatform.placeholder} required/></div>
                  {state.fieldErrors?.[`backup-${index}`] && <p className="field-error" role="alert">{state.fieldErrors[`backup-${index}`]}</p>}
                  <AccountPreview account={backup}/>
                  <div className="backup-meta"><label><span>Label <small>(optional)</small></span><input value={backup.label ?? ""}
                    onChange={(event) => updateDraft((value) => ({ ...value, backups:value.backups.map((item, itemIndex) => itemIndex === index ? { ...item, label:event.target.value } : item) }))}
                    placeholder="e.g. Backup Instagram"/></label>
                    <VisibilityToggle compact checked={backup.isPublic} onChange={(isPublic) => updateDraft((value) => ({ ...value, backups:value.backups.map((item, itemIndex) => itemIndex === index ? { ...item, isPublic } : item) }))}/>
                  </div>
                </article>;
              })}</div>
              <button type="button" className="add-backup-button" onClick={() => updateDraft((value) => ({ ...value, backups:[...value.backups,{ platformId:value.official.platformId, value:"",label:"",isPublic:true }] }))}><Plus size={17}/> Add backup account</button>
            </section>
            {state.error && <p className="platform-form-message error" role="alert">{state.error}</p>}
            {state.success && <p className="platform-form-message success" role="status"><Check size={15}/>{state.success}</p>}
          </div>
          <footer className="platform-editor-actions"><span>{draft.backups.length} {draft.backups.length === 1 ? "backup account" : "backup accounts"}</span>
            <div><button type="button" className="button button-secondary" onClick={requestClose}>Cancel</button><button type="submit" className="button button-primary" disabled={pending || !draft.official.value.trim()}>{pending ? "Saving…" : "Save accounts"}</button></div>
          </footer>
        </form>
      </div>
    </div>}
  </div>;
}

function VisibilityToggle({ checked, onChange, compact = false }: { checked: boolean; onChange: (value: boolean) => void; compact?: boolean }) {
  return <label className={`visibility-toggle ${compact ? "is-compact" : ""}`}>
    <span><strong>Show on my public page</strong>{!compact && <small>Turn this off to keep the account private.</small>}</span>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)}/><i aria-hidden="true"/>
  </label>;
}

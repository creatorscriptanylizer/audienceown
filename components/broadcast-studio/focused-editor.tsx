"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { X } from "lucide-react";

export function FocusedEditor({ step, title, description, children, onClose, onContinue, continueLabel = "Save and continue", continueDisabled = false, hideContinue = false, footer }: {
  step: string; title: string; description: string; children: React.ReactNode;
  onClose: () => void; onContinue: () => void; continueLabel?: string; continueDisabled?: boolean; hideContinue?: boolean; footer?: React.ReactNode;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const handleClose = useEffectEvent(onClose);
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = () => [...panel.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]")];
    focusable()[0]?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); handleClose(); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0], last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, []);

  return <div className="studio-focus-backdrop" role="presentation" onMouseDown={onClose}>
    <section ref={panelRef} className="studio-focus-panel" role="dialog" aria-modal="true" aria-labelledby="studio-focus-title" onMouseDown={(event) => event.stopPropagation()}>
      <header className="studio-focus-header">
        <div><p className="eyebrow">Step {step}</p><h2 id="studio-focus-title">{title}</h2><p>{description}</p></div>
        <button type="button" className="studio-focus-close" onClick={onClose} aria-label={`Close ${title}`}><X/></button>
      </header>
      <div className="studio-focus-content">{children}</div>
      <footer className="studio-focus-actions">
        {footer ?? <><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
          {!hideContinue && <button type="button" className="button button-primary" onClick={onContinue} disabled={continueDisabled}>{continueLabel}</button>}</>}
      </footer>
    </section>
  </div>;
}

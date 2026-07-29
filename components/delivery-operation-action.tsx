"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeliveryOperationAction({
  action,
  targetId,
  label,
}: {
  action: "retry" | "release" | "reconcile";
  targetId: string;
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function run() {
    const reason = window.prompt(`Reason for ${label.toLowerCase()}:`)?.trim();
    if (!reason) {
      setMessage("A reason is required.");
      return;
    }
    if (!window.confirm(`${label}? This action is audited.`)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/internal/operations/deliveries/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(action === "reconcile" ? { eventId: targetId } : { deliveryId: targetId }),
          reason,
        }),
      });
      const result = await response.json() as { ok?: boolean; error?: { code?: string } };
      if (!response.ok) {
        setMessage(result.error?.code?.replaceAll("_", " ") ?? "Action rejected.");
        return;
      }
      setMessage("Action completed.");
      router.refresh();
    } catch {
      setMessage("Operations service unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="flex flex-col items-start gap-1">
    <button className="button button-secondary min-h-9 py-1.5 text-xs" disabled={busy} onClick={run}>
      {busy ? "Working…" : label}
    </button>
    {message && <small role="status" className="text-xs text-zinc-400">{message}</small>}
  </div>;
}

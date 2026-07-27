"use client";

import { useActionState } from "react";
import {
  cancelScheduledUpdate,
  type UpdateActionState,
} from "@/app/dashboard/updates/actions";

export function CancelScheduledButton({ updateId }: { updateId: string }) {
  const [state, action, pending] = useActionState(
    cancelScheduledUpdate.bind(null, updateId),
    {} as UpdateActionState,
  );
  return <form action={action}>
    <button type="submit" className="button button-secondary" disabled={pending}>
      {pending ? "Cancelling…" : "Cancel scheduled update"}
    </button>
    {state.error && <p className="update-field-error" role="alert">{state.error}</p>}
  </form>;
}

"use client";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

export function SubmitButton({ children, className = "button button-primary w-full", pendingText = "Working…", disabled = false }: { children: React.ReactNode; className?: string; pendingText?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending || disabled} className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}>
    {pending && <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" size={16} />}<span aria-live="polite">{pending ? pendingText : children}</span>
  </button>;
}

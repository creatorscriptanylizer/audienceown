"use client";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

export function SubmitButton({ children, className = "button button-primary w-full", pendingText = "Working…", disabled = false }: { children: React.ReactNode; className?: string; pendingText?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending || disabled} className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}>
    {pending && <LoaderCircle className="animate-spin" size={16} />}{pending ? pendingText : children}
  </button>;
}

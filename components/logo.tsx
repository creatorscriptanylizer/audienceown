import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5 font-semibold tracking-[-.03em]" aria-label="AudienceOwn home">
      <span className="relative grid size-8 place-items-center overflow-hidden rounded-[10px] border border-white/15 bg-violet-600 text-white shadow-[0_0_28px_rgb(124_58_237/.24)]">
        <span className="size-3 rotate-45 rounded-[3px] border-2 border-white" />
        <span className="absolute -right-1 -top-1 size-3 rounded-full bg-white/25" />
      </span>
      {!compact && <span className="text-[15px]">Audience<span className="text-violet-400">Own</span></span>}
    </Link>
  );
}

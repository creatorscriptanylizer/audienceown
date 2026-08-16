import Image from "next/image";
import Link from "next/link";

type AudienceOwnLogoProps = {
  variant?: "mark" | "wordmark" | "full";
  size?: number;
  href?: string;
  className?: string;
};

export function AudienceOwnLogo({ variant = "wordmark", size = 40, href = "/", className = "" }: AudienceOwnLogoProps) {
  const content = variant === "full" ? (
    <Image src="/brand/audienceown-logo-full.png" alt="AudienceOwn" width={180} height={180} className="h-auto w-[180px]" priority />
  ) : (
    <>
      <Image src="/brand/audienceown-mark.png" alt="" width={size} height={size} className="shrink-0" />
      {variant === "wordmark" && <span className="text-[15px]">Audience<span className="text-violet-400">Own</span></span>}
    </>
  );

  return (
    <Link href={href} className={`group inline-flex items-center gap-2.5 font-semibold tracking-[-.03em] ${className}`} aria-label="AudienceOwn home">
      {content}
    </Link>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return <AudienceOwnLogo variant={compact ? "mark" : "wordmark"} />;
}

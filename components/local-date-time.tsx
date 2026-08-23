"use client";

import { useState } from "react";
import { formatScheduledDate } from "@/lib/scheduling";

export function LocalDateTime({ value, showTimeZone = true, compact = false, timeZone: timeZoneOverride }: {
  value: string;
  showTimeZone?: boolean;
  compact?: boolean;
  timeZone?: string;
}) {
  const [resolvedTimeZone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const timeZone = timeZoneOverride || resolvedTimeZone;
  const formatted = compact
    ? new Intl.DateTimeFormat("en", { timeZone, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)).replace(/, (?=\d{1,2}:)/, " · ")
    : formatScheduledDate(value, timeZone);
  return <span suppressHydrationWarning>
    {formatted}
    {showTimeZone && <small>{timeZone}</small>}
  </span>;
}

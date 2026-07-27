"use client";

import { useState } from "react";
import { formatScheduledDate } from "@/lib/scheduling";

export function LocalDateTime({ value, showTimeZone = true, timeZone: timeZoneOverride }: {
  value: string;
  showTimeZone?: boolean;
  timeZone?: string;
}) {
  const [resolvedTimeZone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const timeZone = timeZoneOverride || resolvedTimeZone;
  return <span suppressHydrationWarning>
    {formatScheduledDate(value, timeZone)}
    {showTimeZone && <small>{timeZone}</small>}
  </span>;
}

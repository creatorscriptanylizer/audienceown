export type RecoveryAudienceRange = "7d" | "30d" | "90d" | "all";

export type RecoveryAudienceSummary = {
  protectedAudience: number;
  recoveryConnections: number;
  recoveryDestinations: number;
  growth: {
    range: RecoveryAudienceRange;
    historySource: "recovery_pass_destination_selected_at";
    points: Array<{
      date: string;
      protectedAudience: number;
      recoveryConnections: number;
    }>;
  };
};

export function emptyRecoveryAudienceSummary(range: RecoveryAudienceRange): RecoveryAudienceSummary {
  return {
    protectedAudience: 0,
    recoveryConnections: 0,
    recoveryDestinations: 0,
    growth: { range, historySource: "recovery_pass_destination_selected_at", points: [] },
  };
}

export function parseRecoveryAudienceSummary(value: unknown, range: RecoveryAudienceRange): RecoveryAudienceSummary {
  if (!value || typeof value !== "object") return emptyRecoveryAudienceSummary(range);
  const row = value as Record<string, unknown>;
  const growth = row.growth && typeof row.growth === "object" ? row.growth as Record<string, unknown> : {};
  const points = Array.isArray(growth.points) ? growth.points.flatMap((point) => {
    if (!point || typeof point !== "object") return [];
    const item = point as Record<string, unknown>;
    if (typeof item.date !== "string") return [];
    return [{ date: item.date, protectedAudience: Number(item.protectedAudience ?? 0), recoveryConnections: Number(item.recoveryConnections ?? 0) }];
  }) : [];
  return {
    protectedAudience: Number(row.protectedAudience ?? 0),
    recoveryConnections: Number(row.recoveryConnections ?? 0),
    recoveryDestinations: Number(row.recoveryDestinations ?? 0),
    growth: { range, historySource: "recovery_pass_destination_selected_at", points },
  };
}

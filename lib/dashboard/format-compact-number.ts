export function formatCompactAudience(value: number) {
  const maximumFractionDigits = value >= 1_000_000 ? 2 : value >= 10_000 ? 1 : value >= 1_000 ? 2 : 0;
  return {
    compact: new Intl.NumberFormat("en", { notation: "compact", compactDisplay: "short", maximumFractionDigits }).format(value),
    exact: new Intl.NumberFormat("en").format(value),
  };
}

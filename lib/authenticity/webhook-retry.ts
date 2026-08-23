export function webhookRetry(attempt: number, max: number, status?: number) {
  if (attempt >= max) return "failed" as const;
  if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) return "failed" as const;
  return "retrying" as const;
}

// Cost estimation for the AI company analysis (DeepSeek deepseek-v4-flash).
//
// Prices and the peak/off-peak window come from
// https://api-docs.deepseek.com/quick_start/pricing/ — "Off-peak rates are half
// of the peak rates. Peak hours are 01:00 - 04:00 and 06:00 - 10:00 UTC, Monday
// through Friday (all other hours are off-peak)."
//
// Keep the price table and the peak windows in sync with
// leadblocks-strapi/src/queues/aiAnalysisProcess.queue.ts, which bills each
// individual call with the same numbers and accumulates the totals on the
// batch it belongs to.

/** USD per 1M tokens, peak rate. Off-peak is half of this. */
export const DEEPSEEK_PRICE_PER_MTOK_PEAK = {
  cacheHit: 0.014,
  cacheMiss: 0.44,
  output: 1.32,
};

// Tokens spent on one company, measured against the caps in the queue: at most
// 5 pages / 10.000 chars of website content plus company data and the prompt
// template (~0.3 token per character), and a JSON answer with thinking mode
// off. Cached input is left at 0 — only the prompt template prefix can hit the
// cache and it is a rounding error against the per-company page content.
//
// To refresh these from real data: run a batch and read the totals the queue
// accumulates on it (`tokens` in the batch stats — prompt/completion/reasoning
// tokens and cost_usd), then divide by the number of completed companies.
export const ANALYSIS_TOKENS_PER_COMPANY = {
  cacheHitInput: 0,
  cacheMissInput: 3000,
  output: 400,
};

/** Peak hours are 01:00-04:00 and 06:00-10:00 UTC, Monday through Friday. */
const PEAK_WINDOWS_UTC: { start: number; end: number }[] = [
  { start: 1, end: 4 },
  { start: 6, end: 10 },
];

export function isPeakRate(at: Date): boolean {
  const day = at.getUTCDay();
  if (day === 0 || day === 6) return false;
  const hour = at.getUTCHours() + at.getUTCMinutes() / 60;
  return PEAK_WINDOWS_UTC.some(w => hour >= w.start && hour < w.end);
}

/** End of the peak window `at` falls in, or null when it is already off-peak. */
export function peakWindowEndsAt(at: Date): Date | null {
  if (!isPeakRate(at)) return null;
  const hour = at.getUTCHours() + at.getUTCMinutes() / 60;
  const window = PEAK_WINDOWS_UTC.find(w => hour >= w.start && hour < w.end);
  if (!window) return null;
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate(), window.end, 0, 0, 0));
}

export function costPerCompany(peak: boolean): number {
  const rateFactor = peak ? 1 : 0.5;
  return (
    ((ANALYSIS_TOKENS_PER_COMPANY.cacheHitInput * DEEPSEEK_PRICE_PER_MTOK_PEAK.cacheHit) +
      (ANALYSIS_TOKENS_PER_COMPANY.cacheMissInput * DEEPSEEK_PRICE_PER_MTOK_PEAK.cacheMiss) +
      (ANALYSIS_TOKENS_PER_COMPANY.output * DEEPSEEK_PRICE_PER_MTOK_PEAK.output)) *
    rateFactor / 1_000_000
  );
}

export interface AnalysisCostEstimate {
  /** Whether the peak rate applies right now. */
  peak: boolean;
  /** Cost of the batch at the rate that applies right now. */
  costUsd: number;
  /** Cost of the same batch at the off-peak rate. */
  offPeakCostUsd: number;
  /** What waiting for off-peak saves; 0 when it is already off-peak. */
  savingsUsd: number;
  /** When the current peak window ends; null when it is already off-peak. */
  offPeakStartsAt: Date | null;
  /** Milliseconds until the peak window ends; null when it is already off-peak. */
  msUntilOffPeak: number | null;
}

export function estimateAnalysisCost(companyCount: number, at: Date): AnalysisCostEstimate {
  const peak = isPeakRate(at);
  const costUsd = companyCount * costPerCompany(peak);
  const offPeakCostUsd = companyCount * costPerCompany(false);
  const offPeakStartsAt = peakWindowEndsAt(at);

  return {
    peak,
    costUsd,
    offPeakCostUsd,
    savingsUsd: costUsd - offPeakCostUsd,
    offPeakStartsAt,
    msUntilOffPeak: offPeakStartsAt ? Math.max(offPeakStartsAt.getTime() - at.getTime(), 0) : null,
  };
}

/** Small amounts need more decimals than a dollar-and-cents format allows. */
export function formatUsd(value: number): string {
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(4)}`;
}

/** "2h 15m" / "45m" / "< 1m" — how long until the cheaper window opens. */
export function formatCountdown(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60000);
  if (totalMinutes < 1) return '< 1m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
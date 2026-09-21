export const MARKET_OPTIONS = ['CZ', 'DE', 'CN', 'US'] as const;
export type Market = (typeof MARKET_OPTIONS)[number];

export const ENABLED_MARKETS: Market[] = ['CZ', 'DE', 'CN'];

export const MAG_MAP: Record<Market, string[]> = {
  CZ: ['RTB'],
  DE: ['RTB'],
  CN: ['Shavers'],
  US: ['RTB', 'BH'],
};

export const RETAILER_MAP: Record<string, string[]> = {
  'CZ|RTB': ['All'],
  'DE|RTB': ['Amazon'],
  'CN|Shavers': ['Tmall'],
  'US|RTB': ['All', 'Amazon', 'Costco', 'Target', 'Walmart'],
  'US|BH': ['All', 'Amazon', 'Costco', 'Target', 'Walmart'],
};

export const ANALYSIS_YEARS = [2025, 2024] as const;

export const PERIODS = ['fullYear', 'Q1', 'Q2', 'Q3', 'Q4'] as const;
export type Period = (typeof PERIODS)[number];

export const BANDS = ['All', 'LRTB', 'MRTB', 'HRTB'] as const;
export type Band = (typeof BANDS)[number];

export const METRIC_LABELS: Record<string, string> = {
  incr_units: 'Incremental units',
  return_per_kc: 'Promo ROI (%)',
  revenue: 'Revenue',
  profit: 'Profit',
};

export const METRIC_AXIS_LABELS: Record<string, string> = {
  incr_units: 'Incremental units',
  return_per_kc: 'Promo ROI (%)',
  revenue: 'Revenue',
  profit: 'Profit',
};

export const DEPTH_COLORS = [
  '#d6efe0',
  '#b3e2c7',
  '#8fd4ad',
  '#6bc593',
  '#47b67a',
  '#2f9d63',
  '#1f8f5f',
  '#14663f',
];

export const STAGE_IDS = ['historical', 'config', 'optimized'] as const;
export type StageId = (typeof STAGE_IDS)[number];

export const STEP_LABELS: Record<StageId, string> = {
  historical: 'Historical View',
  config: 'Optimization Configuration',
  optimized: 'Optimized View',
};

export const TODAY_LABEL = '27-Jul-2026';

/** Types matching the /api/historical_summary response shape. */

export interface HistoricalTotals {
  n_skus: number;
  revenue: number;
  profit: number;
  spend: number;
  return_per_kc: number;
  incremental?: number;
  incremental_units?: number;
  volume_factor: number;
  // Satyam feedback (2026-09-16): IGM = (TN_price - COGS) × qty (COGS only).
  igm?: number;
  igm_margin_pct?: number;
  base_igm?: number;
  base_igm_margin_pct?: number;
  base_revenue?: number;
  promo_effectiveness?: number; // (revenue - base_revenue) / spend
}

export interface PortfolioRow {
  sku: string;
  band: string;
  spend: number;
  revenue: number;
  profit: number;
  return_per_kc: number;
  // Populated from BE when available.
  incr_units?: number;
  incremental?: number;
}

export interface WeeklyRow {
  week: number;
  spend: number;
  revenue: number;
  profit: number;
  return_per_kc: number;
  incr_units?: number;
  // Satyam feedback (2026-09-08): discount depth for heat map hover, and a
  // no-promo revenue baseline so "Promo Effectiveness" (incremental revenue /
  // spend) can be computed alongside the existing profit-based metric.
  discount?: number;
  base_revenue?: number;
  // Already sent by the backend, just never wired through before — needed for
  // the Incremental Units heat map tooltip (baseline vs. actual units).
  qty_actual?: number;
  qty_base?: number;
  avg_price?: number; // sell-out ASP (consumer shelf price) — Units vs ASP chart
}

export interface HistoricalSummary {
  year: number;

  currency: {
    code: string;
    symbol: string;
  };

  n_skus_total: number;
  totals: HistoricalTotals;
  portfolio: PortfolioRow[];
  weekly: Record<string, WeeklyRow[]>;
}
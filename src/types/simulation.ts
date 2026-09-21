export interface SkuItem {
  sku: string;
  band: string;
}

export interface SkusResponse {
  skus: SkuItem[];
  ref_spend: Record<string, number>;
}

export interface RetroRequest {
  skus: string[];
  year: number;
  period: string;
  economics: 'tn' | 'legacy';
  objective: string;
  max_discount: number;
  budget_multiplier: number;
  ref_year: number;
  unconstrained: boolean;
  alpha: number | null;
  margin_floor: number;
  allocation_mode: string;
  q_splits: Record<string, number> | null;
}

export interface PlanRequest {
  skus: string[];
  plan_year: number;
  base_year: number;
  use_trend: boolean;
  economics: 'tn' | 'legacy';
  objective: string;
  max_discount: number;
  budget_multiplier: number;
  ref_year: number;
  q_splits: Record<string, number>;
  unconstrained: boolean;
  alpha: number | null;
  margin_floor: number;
}

export interface TierAction {
  sku: string;
  week: number;
  weeks_label: string;
  discount_text: string;
  action_text: string;
  impact: number;
  action_type: string;
}

export interface TierBucket {
  count: number;
  total_gain: number;
  actions: TierAction[];
}

export interface WhyReason {
  num: string;
  tag: string;
  title: string;
  body: string;
}

export interface CompareMetrics {
  turnover: number;
  profit: number;
  margin: number;
  qty: number;
  promo_weeks: number;
  promo_spend: number;
  // Satyam feedback (2026-09-16): IGM = (TN_price - COGS) × qty; margin and
  // effectiveness added so rail cards can show both without re-computing.
  igm?: number;
  igm_margin_pct?: number;
  igm_delta?: number; // recommended only: opt_igm - act_igm
  base_revenue?: number;
  promo_effectiveness?: number; // (revenue - base_revenue) / spend
}

export interface TimelineEntry {
  codes: number[];
  opt_disc: number[];
  act_disc: number[];
}

export interface WeeklyChart {
  weeks: number[];
  base: number[];
  actual: number[];
  optimal: number[];
}

export interface SkuTableRow {
  sku: string;
  base_profit: number;
  act_profit: number;
  opt_profit: number;
  gain: number;
  act_promo_spend: number;
  promo_spend: number;
  confidence: string;
  roi: number | null;
  act_roi: number | null;

  // TODO: replace with real BE field when /api/run_retro|run_plan includes volume uplift
  incr_units?: number;
}

export interface SimulationResponse {
  status: string;
  objective: string;

  currency: {
    code: string;
    symbol: string;
  };

  hero: {
    eyebrow: string;
    pill_text: string;
    value: string;
    label: string;
    delta: string;
    verdict: string;
    confidence: string;
    data_sub: string;
    margin_html: string;
    budget_used: string;
    budget_sub: string;
  };

  tiers: {
    definitely_do: TierBucket;
    worth_considering: TierBucket;
    minor_impact: TierBucket;
  };

  why_reasons: WhyReason[];

  compare: {
    current: CompareMetrics;

    historical?: CompareMetrics & {
      year: number;
    };

    recommended: CompareMetrics & {
      effective_turnover: number;
      delta_effective_turnover: number;
      delta_effective_pct: number;
    };
  };

  compare_vs_base: boolean;

  quarterly_allocation: Record<
    string,
    {
      pct: number;
      kc: number;
    }
  >;

  quarterly_actual: Record<
    string,
    {
      pct: number;
      kc: number;
    }
  >;

  quarterly_envelopes: Record<string, number> | null;

  timeline: Record<string, TimelineEntry>;

  weekly_chart: WeeklyChart;

  deep_dive: {
    sku_table: SkuTableRow[];
  };

  elasticity: {
    series: Record<
      string,
      Array<{
        week: number;
        median: number;
        min: number;
        max: number;
      }>
    >;

    depth_curves_profit: Record<
      string,
      Array<{
        discount: number;
        median: number;
        min: number;
        max: number;
      }>
    >;

    depth_curves_revenue: Record<
      string,
      Array<{
        discount: number;
        median: number;
        min: number;
        max: number;
      }>
    >;

    weeks: number[];

    obj_label: string;

    sku_list?: string[];

    pooled?: {
      depth_profit?: Array<{
        discount: number;
        median: number;
        min: number;
        max: number;
      }>;

      depth_revenue?: Array<{
        discount: number;
        median: number;
        min: number;
        max: number;
      }>;

      beta_weekly?: Array<{
        week: number;
        median: number;
        min: number;
        max: number;
      }>;
    };

    per_sku?: Record<
      string,
      {
        depth_profit?: Array<{
          discount: number;
          median: number;
          min: number;
          max: number;
        }>;

        depth_revenue?: Array<{
          discount: number;
          median: number;
          min: number;
          max: number;
        }>;

        beta_weekly?: Array<{
          week: number;
          value: number;
        }>;
      }
    >;
  };

  roi: {
    optimal: number | null;
    actual: number | null;
    per_quarter: Record<string, number | null>;
  };

  prelaunch: Record<
    string,
    {
      launch_week: number;
      weeks: number[];
    }
  >;

  volume_factor: number;
  volume_factor_actual: number;

  weekly_chart_units?: {
    weeks: number[];
    base: number[];
    optimal: number[];
    actual: number[];
    per_sku: Record<string, {
      base: number[];
      optimal: number[];
      actual: number[];
      opt_rev: number[];
      base_rev: number[];
      opt_spend: number[];
    }>;
  };
}
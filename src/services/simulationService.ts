import { axiosInstance } from '~/utils/apiClient';
import type {
  SkusResponse,
  RetroRequest,
  PlanRequest,
  SimulationResponse,
} from '~/types/simulation';
import type { HistoricalSummary } from '~/types/historical';

export async function fetchSkus(bands = 'LRTB,MRTB,HRTB'): Promise<SkusResponse> {
  const response = await axiosInstance.get<SkusResponse>(
    `/itaap-digitalit-promosimulator-coreservice/api/skus?bands=${bands}`,
  );
  return response.data;
}

export async function fetchHealth() {
  const response = await axiosInstance.get(
    '/itaap-digitalit-promosimulator-coreservice/api/health',
  );
  return response.data;
}

export async function runRetro(request: RetroRequest): Promise<SimulationResponse> {
  const response = await axiosInstance.post<SimulationResponse>(
    '/itaap-digitalit-promosimulator-coreservice/api/run_retro',
    request,
  );
  return response.data;
}

export async function runPlan(request: PlanRequest): Promise<SimulationResponse> {
  const response = await axiosInstance.post<SimulationResponse>(
    '/itaap-digitalit-promosimulator-coreservice/api/run_plan',
    request,
  );
  return response.data;
}

export async function fetchHistoricalData(
  year: number,
  classification?: string,
  sku?: string,
  economics: 'tn' | 'legacy' = 'tn',
): Promise<HistoricalSummary> {
  const params: Record<string, string | number> = {
    year,
    economics,
  };

  if (classification) {
    params.classification = classification;
  }

  if (sku) {
    params.sku = sku;
  }

  const res = await axiosInstance.get<Record<string, unknown>>(
    '/itaap-digitalit-promosimulator-coreservice/api/historical-data',
    { params },
  );

  // API may nest data under the year key or return it at the top level
  const raw = (res.data[String(year)] ?? res.data) as {
    kpis: {
      Revenue: number;
      Profit: number;
      Spend: number;
      ReturnPerKc: number;
      Incremental?: number;
      IncrementalUnits?: number;
      VolumeFactor: number;
      Igm?: number;
      IgmMarginPct?: number;
      BaseIgm?: number;
      BaseIgmMarginPct?: number;
      BaseRevenue?: number;
      PromoEffectiveness?: number;
    };

    sku_summary: Array<{
      SKU: string;
      Classification?: string;
      Spend: number;
      Revenue: number;
      Profit: number;
      ReturnPerKc: number;
      Incremental?: number;
      IncrementalUnits?: number;
    }>;

    weekly_trends: Record<
      string,
      Array<{
        Week: number;
        Revenue: number;
        Profit: number;
        PromoSpend: number;
        ReturnPerKc: number;
        IncrementalUnits?: number;
        // Satyam feedback (2026-09-08): discount depth + no-promo revenue
        // baseline, added to weekly_trends only.
        Discount?: number;
        BaseRevenue?: number;
        // Already returned by the backend; just not wired through before.
        QtyActual?: number;
        QtyBase?: number;
        AvgPrice?: number; // sell-out ASP per week
      }>
    >;

    currency: {
      code: string;
      symbol: string;
    };
  };

  return {
    year,

    currency: {
      code: raw.currency.code,
      symbol: raw.currency.symbol,
    },

    n_skus_total: raw.sku_summary.length,

    totals: {
      n_skus: raw.sku_summary.length,
      revenue: raw.kpis.Revenue,
      profit: raw.kpis.Profit,
      spend: raw.kpis.Spend,
      return_per_kc: raw.kpis.ReturnPerKc,
      incremental: raw.kpis.Incremental,
      incremental_units: raw.kpis.IncrementalUnits,
      volume_factor: raw.kpis.VolumeFactor,
      igm: raw.kpis.Igm,
      igm_margin_pct: raw.kpis.IgmMarginPct,
      base_igm: raw.kpis.BaseIgm,
      base_igm_margin_pct: raw.kpis.BaseIgmMarginPct,
      base_revenue: raw.kpis.BaseRevenue,
      promo_effectiveness: raw.kpis.PromoEffectiveness,
    },

    portfolio: raw.sku_summary.map((s) => ({
      sku: s.SKU,
      band: s.Classification ?? '',
      spend: s.Spend,
      revenue: s.Revenue,
      profit: s.Profit,
      return_per_kc: s.ReturnPerKc,
      incremental: s.Incremental,
      incr_units: s.IncrementalUnits,
    })),

    weekly: Object.fromEntries(
      Object.entries(raw.weekly_trends).map(([skuKey, rows]) => [
        skuKey,
        rows.map((r) => ({
          week: r.Week,
          spend: r.PromoSpend,
          revenue: r.Revenue,
          profit: r.Profit,
          return_per_kc: r.ReturnPerKc,
          incr_units: r.IncrementalUnits,
          discount: r.Discount,
          base_revenue: r.BaseRevenue,
          qty_actual: r.QtyActual,
          qty_base: r.QtyBase,
          avg_price: r.AvgPrice,
        })),
      ]),
    ),
  };
}
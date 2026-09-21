import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('~/utils/apiClient', () => ({
  axiosInstance: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { axiosInstance } from '~/utils/apiClient';
import {
  fetchHealth,
  fetchSkus,
  fetchHistoricalData,
  runRetro,
  runPlan,
} from '~/services/simulationService';
import type { RetroRequest, PlanRequest } from '~/types/simulation';

const mockGet = vi.mocked(axiosInstance.get);
const mockPost = vi.mocked(axiosInstance.post);

const API = '/itaap-digitalit-promosimulator-coreservice/api';

const makeRetroRequest = (overrides: Partial<RetroRequest> = {}): RetroRequest => {
  const { economics: overrideEconomics, ...rest } = overrides;
  return {
    skus: ['HX9911/09'],
    year: 2024,
    period: 'Full year',
    economics: overrideEconomics ?? 'tn',
    objective: 'profit',
    max_discount: 0.25,
    budget_multiplier: 1.0,
    ref_year: 2023,
    unconstrained: false,
    alpha: null,
    margin_floor: 0.4,
    allocation_mode: 'actual',
    q_splits: null,
    ...rest,
  };
};

const makePlanRequest = (overrides: Partial<PlanRequest> = {}): PlanRequest => {
  const { economics: overrideEconomics, ...rest } = overrides;
  return {
    skus: ['HX9911/09'],
    plan_year: 2025,
    base_year: 2024,
    use_trend: true,
    economics: overrideEconomics ?? 'tn',
    objective: 'profit',
    max_discount: 0.25,
    budget_multiplier: 1.0,
    ref_year: 2024,
    q_splits: { Q1: 25, Q2: 25, Q3: 25, Q4: 25 },
    unconstrained: false,
    alpha: null,
    margin_floor: 0.4,
    ...rest,
  };
};

describe('simulationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── fetchSkus ────────────────────────────────────────────────────────────────

  describe('fetchSkus', () => {
    it('calls GET /skus with default bands and returns data', async () => {
      const response = { skus: [{ sku: 'HX9911/09', band: 'HRTB' }], ref_spend: {} };
      mockGet.mockResolvedValue({ data: response });
      const result = await fetchSkus();
      expect(mockGet).toHaveBeenCalledWith(`${API}/skus?bands=LRTB,MRTB,HRTB`);
      expect(result).toEqual(response);
    });

    it('calls GET /skus with provided bands', async () => {
      mockGet.mockResolvedValue({ data: { skus: [], ref_spend: {} } });
      await fetchSkus('HRTB');
      expect(mockGet).toHaveBeenCalledWith(`${API}/skus?bands=HRTB`);
    });
  });

  // ── fetchHealth ──────────────────────────────────────────────────────────────

  describe('fetchHealth', () => {
    it('calls GET /health and returns response data', async () => {
      mockGet.mockResolvedValue({ data: { status: 'ok' } });
      const result = await fetchHealth();
      expect(mockGet).toHaveBeenCalledWith(`${API}/health`);
      expect(result).toEqual({ status: 'ok' });
    });
  });

  // ── runRetro ─────────────────────────────────────────────────────────────────

  describe('runRetro', () => {
    it('calls POST /run_retro with request payload', async () => {
      const request = makeRetroRequest();
      const response = { status: 'ok', objective: 'profit' };
      mockPost.mockResolvedValue({ data: response });
      const result = await runRetro(request);
      expect(mockPost).toHaveBeenCalledWith(`${API}/run_retro`, request);
      expect(result).toEqual(response);
    });
  });

  // ── runPlan ──────────────────────────────────────────────────────────────────

  describe('runPlan', () => {
    it('calls POST /run_plan with request payload', async () => {
      const request = makePlanRequest();
      const response = { status: 'ok', objective: 'profit' };
      mockPost.mockResolvedValue({ data: response });
      const result = await runPlan(request);
      expect(mockPost).toHaveBeenCalledWith(`${API}/run_plan`, request);
      expect(result).toEqual(response);
    });
  });

  // ── fetchHistoricalData ──────────────────────────────────────────────────────

  describe('fetchHistoricalData', () => {
    it('calls GET /historical-data with year param', async () => {
      const rawResponse = {
        kpis: { Revenue: 100, Profit: 50, Spend: 10, ReturnPerKc: 1.5 },
        sku_summary: [
          { SKU: 'HX9911/09', Spend: 10, Revenue: 100, Profit: 50, ReturnPerKc: 1.5 },
        ],
        weekly_trends: {
          'HX9911/09': [
            { Week: 1, Revenue: 20, Profit: 10, PromoSpend: 2, ReturnPerKc: 1.0 },
          ],
        },
      };
      mockGet.mockResolvedValue({ data: rawResponse });
      const result = await fetchHistoricalData(2024);
      expect(mockGet).toHaveBeenCalledWith(
        `${API}/historical-data`,
        { params: { year: 2024, economics: 'tn' } },
      );
      expect(result.year).toBe(2024);
      expect(result.totals.revenue).toBe(100);
    });

    it('includes classification and sku params when provided', async () => {
      const rawResponse = {
        kpis: { Revenue: 100, Profit: 50, Spend: 10, ReturnPerKc: 1.0 },
        sku_summary: [],
        weekly_trends: {},
      };
      mockGet.mockResolvedValue({ data: rawResponse });
      await fetchHistoricalData(2024, 'HRTB', 'HX9911/09', 'legacy');
      expect(mockGet).toHaveBeenCalledWith(
        `${API}/historical-data`,
        { params: { year: 2024, economics: 'legacy', classification: 'HRTB', sku: 'HX9911/09' } },
      );
    });

    it('maps portfolio data correctly', async () => {
      const rawResponse = {
        kpis: { Revenue: 200, Profit: 100, Spend: 20, ReturnPerKc: 2.0 },
        sku_summary: [
          { SKU: 'HX9911/09', Spend: 20, Revenue: 200, Profit: 100, ReturnPerKc: 2.0 },
        ],
        weekly_trends: {},
      };
      mockGet.mockResolvedValue({ data: rawResponse });
      const result = await fetchHistoricalData(2024);
      expect(result.portfolio).toHaveLength(1);
      expect(result.portfolio[0].sku).toBe('HX9911/09');
      expect(result.portfolio[0].band).toBe('');
      expect(result.portfolio[0].revenue).toBe(200);
    });

    it('maps weekly trends into sku-keyed arrays', async () => {
      const rawResponse = {
        kpis: { Revenue: 100, Profit: 50, Spend: 10, ReturnPerKc: 1.0 },
        sku_summary: [],
        weekly_trends: {
          'HX9911/09': [
            { Week: 1, Revenue: 20, Profit: 10, PromoSpend: 2, ReturnPerKc: 1.0 },
            { Week: 2, Revenue: 30, Profit: 15, PromoSpend: 3, ReturnPerKc: 1.2 },
          ],
        },
      };
      mockGet.mockResolvedValue({ data: rawResponse });
      const result = await fetchHistoricalData(2024);
      expect(result.weekly['HX9911/09']).toHaveLength(2);
      expect(result.weekly['HX9911/09'][0].week).toBe(1);
      expect(result.weekly['HX9911/09'][0].spend).toBe(2);
    });

    it('handles API response nested under year key', async () => {
      const inner = {
        kpis: { Revenue: 300, Profit: 150, Spend: 30, ReturnPerKc: 3.0 },
        sku_summary: [],
        weekly_trends: {},
      };
      mockGet.mockResolvedValue({ data: { 2024: inner } });
      const result = await fetchHistoricalData(2024);
      expect(result.totals.revenue).toBe(300);
    });
  });
});

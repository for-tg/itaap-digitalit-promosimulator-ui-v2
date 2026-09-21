import { describe, expect, it } from 'vitest';

import * as simulationModule from '~/types/simulation';
import type { PlanRequest, RetroRequest } from '~/types/simulation';

describe('simulation types', () => {
  it('loads module at runtime', () => {
    expect(simulationModule).toBeDefined();
    expect(typeof simulationModule).toBe('object');
  });

  it('accepts retro and plan request payloads', () => {
    const retro: RetroRequest = {
      skus: ['SKU-1'],
      year: 2025,
      period: 'Q1',
      economics: 'tn',
      objective: 'profit',
      max_discount: 0.3,
      budget_multiplier: 1.1,
      ref_year: 2024,
      unconstrained: false,
      alpha: null,
      margin_floor: 0.2,
      allocation_mode: 'actual',
      q_splits: null,
    };

    const plan: PlanRequest = {
      skus: ['SKU-1'],
      plan_year: 2026,
      base_year: 2025,
      use_trend: true,
      economics: 'legacy',
      objective: 'revenue',
      max_discount: 0.35,
      budget_multiplier: 1,
      ref_year: 2025,
      q_splits: { Q1: 25, Q2: 25, Q3: 25, Q4: 25 },
      unconstrained: true,
      alpha: 0.5,
      margin_floor: 0.15,
    };

    expect(retro.skus).toEqual(['SKU-1']);
    expect(plan.plan_year).toBe(2026);
  });

  // it('accepts a simulation response shape', () => {
  //   const response: SimulationResponse = {
  //     status: 'ok',
  //     objective: 'profit',
  //     hero: {
  //       eyebrow: 'Eyebrow',
  //       pill_text: 'Pill',
  //       value: '100',
  //       label: 'Label',
  //       delta: '+5%',
  //       verdict: 'good',
  //       confidence: 'high',
  //       data_sub: 'sub',
  //       margin_html: '<b>1</b>',
  //       budget_used: '50',
  //       budget_sub: 'kc',
  //     },
  //     tiers: {
  //       definitely_do: { count: 1, total_gain: 10, actions: [] },
  //       worth_considering: { count: 0, total_gain: 0, actions: [] },
  //       minor_impact: { count: 0, total_gain: 0, actions: [] },
  //     },
  //     why_reasons: [],
  //     compare: {
  //       current: {
  //         turnover: 1,
  //         profit: 1,
  //         margin: 1,
  //         qty: 1,
  //         promo_weeks: 1,
  //         promo_spend: 1,
  //       },
  //       recommended: {
  //         turnover: 1,
  //         profit: 1,
  //         margin: 1,
  //         qty: 1,
  //         promo_weeks: 1,
  //         promo_spend: 1,
  //         effective_turnover: 1,
  //         delta_effective_turnover: 1,
  //         delta_effective_pct: 1,
  //       },
  //     },
  //     compare_vs_base: true,
  //     quarterly_allocation: {},
  //     quarterly_actual: {},
  //     quarterly_envelopes: null,
  //     timeline: {},
  //     weekly_chart: { weeks: [], base: [], actual: [], optimal: [] },
  //     deep_dive: { sku_table: [] },
  //     elasticity: {
  //       series: {},
  //       depth_curves_profit: {},
  //       depth_curves_revenue: {},
  //       weeks: [],
  //       obj_label: 'Profit',
  //     },
  //     roi: {
  //       optimal: null,
  //       actual: null,
  //       per_quarter: {},
  //     },
  //     prelaunch: {},
  //   };

  //   expect(response.status).toBe('ok');
  //   expect(response.weekly_chart.weeks).toHaveLength(0);
  // });
});

import { cleanup, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  optimizedTab: 'summary' as 'summary' | 'elasticity' | 'calendar' | 'deepdive',
  config: { selectedSkus: ['SKU-1'], blend: 50 },
  elasticMetric: 'profit',
  elasticScope: 'all',
  elasticSkuSel: 'SKU-1',
  elasticMax: null,
  calMode: 'recommended',
  setElasticMetric: vi.fn(),
  setElasticScope: vi.fn(),
  setElasticSkuSel: vi.fn(),
  setElasticMax: vi.fn(),
  setCalMode: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('~/contexts/SimulatorContext', () => ({
  useSimulator: () => mockState,
}));

import { ResultsPanel } from '~/components/Results/ResultsPanel';

class ResizeObserverMock {
  observe() {}
  disconnect() {}
  unobserve() {}
}

beforeAll(() => {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: ResizeObserverMock,
  });
});

afterAll(() => {
  delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
});

const results = {
  objective: 'profit',
  hero: {
    eyebrow: 'Eyebrow',
    pill_text: 'Pill',
    value: '100',
    label: 'Profit',
    delta: '+10%',
    verdict: '<b>OK</b>',
    confidence: 'High',
    data_sub: 'Data',
    margin_html: '<span>20%</span>',
    budget_used: '80%',
    budget_sub: 'Sub',
  },
  compare: { current: { turnover: 100, profit: 50, margin: 20, qty: 10, promo_weeks: 4, promo_spend: 20 }, recommended: { turnover: 120, profit: 60, margin: 25, qty: 12, promo_weeks: 5, promo_spend: 25, effective_turnover: 120, delta_effective_turnover: 20, delta_effective_pct: 20 } },
  tiers: { definitely_do: { count: 1, total_gain: 10, actions: [{ sku: 'SKU-1', weeks_label: 'W1', action_text: 'Action', impact: 10 }] }, worth_considering: { count: 0, total_gain: 0, actions: [] }, minor_impact: { count: 0, total_gain: 0, actions: [] } },
  why_reasons: [{ num: '1', tag: 'Tag', title: 'Reason', body: '<p>Body</p>' }],
  timeline: { 'SKU-1': { opt_disc: Array(52).fill(0), act_disc: Array(52).fill(0) } },
  elasticity: { series: {}, depth_curves_profit: {}, depth_curves_revenue: {}, weeks: [], obj_label: '' },
  deep_dive: { sku_table: [{ sku: 'SKU-1', base_profit: 1, act_profit: 2, opt_profit: 3, gain: 1, act_promo_spend: 1, promo_spend: 1, roi: 1, act_roi: 0.5 }] },
  weekly_chart: {},
};

afterEach(() => {
  cleanup();
  mockState.optimizedTab = 'summary';
});

describe('ResultsPanel', () => {
  it('switches through summary, elasticity, calendar, and deep dive tabs', () => {
    const { rerender } = render(<ResultsPanel results={results as never} />);
    expect(screen.getByText('optimizedView.comparison.title')).toBeInTheDocument();

    mockState.optimizedTab = 'elasticity';
    rerender(<ResultsPanel results={results as never} />);
    expect(screen.getByText('optimizedView.elasticity.discountDepthResponse')).toBeInTheDocument();

    mockState.optimizedTab = 'calendar';
    rerender(<ResultsPanel results={results as never} />);
    expect(screen.getByText('optimizedView.calendar.promotionalCalendarWeeks')).toBeInTheDocument();

    mockState.optimizedTab = 'deepdive';
    rerender(<ResultsPanel results={results as never} />);
    expect(screen.getByText('optimizedView.deepDive.title')).toBeInTheDocument();
  });
});
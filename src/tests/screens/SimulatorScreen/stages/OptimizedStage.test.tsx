import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  results: {
    objective: 'profit',
    hero: {
      eyebrow: 'Best case',
      pill_text: '',
      value: '120',
      label: 'Profit',
      delta: '+10%',
      verdict: '<b>Good</b>',
      confidence: 'High',
      data_sub: 'Based on data',
      margin_html: '<span>18%</span>',
      budget_used: '80%',
      budget_sub: 'Within budget',
    },
    compare: {
      current: { turnover: 100, profit: 50, margin: 20, qty: 10, promo_weeks: 4, promo_spend: 30 },
      recommended: { turnover: 120, profit: 60, margin: 25, qty: 12, promo_weeks: 5, promo_spend: 35, effective_turnover: 120, delta_effective_turnover: 20, delta_effective_pct: 20 },
    },
    tiers: { definitely_do: { count: 1, total_gain: 10, actions: [{ sku: 'SKU-1', weeks_label: 'W1', action_text: 'Action', impact: 10 }] }, worth_considering: { count: 0, total_gain: 0, actions: [] }, minor_impact: { count: 0, total_gain: 0, actions: [] } },
    why_reasons: [{ num: '1', tag: 'Tag', title: 'Title', body: '<p>Body</p>' }],
    timeline: { 'SKU-1': { opt_disc: Array(52).fill(0), act_disc: Array(52).fill(0) } },
    elasticity: { series: {}, depth_curves_profit: {}, depth_curves_revenue: {}, weeks: [], obj_label: '' },
    deep_dive: { sku_table: [] },
    weekly_chart: {},
  },
  config: { blend: 50, mode: 'Forward-looking', budgetMode: 'Constrained' },
  optimizedTab: 'summary' as 'summary' | 'elasticity' | 'calendar' | 'deepdive',
  setOptimizedTab: vi.fn((tab: typeof mockState.optimizedTab) => { mockState.optimizedTab = tab; }),
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

vi.mock('~/components/Results/ResultsPanel', () => ({
  ResultsPanel: () => <div data-testid="results-panel" />,
}));

import { OptimizedStage } from '~/screens/SimulatorScreen/stages/OptimizedStage';

afterEach(() => {
  cleanup();
  mockState.optimizedTab = 'summary';
  mockState.setOptimizedTab.mockClear();
});

describe('OptimizedStage', () => {
  it('renders config card and tab buttons', async () => {
    const user = userEvent.setup();

    render(<OptimizedStage />);

    expect(screen.getByTestId('results-panel')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /optimizedView\.cards\.mode/i }));
    expect(screen.getByText('optimizedView.cards.mode')).toBeInTheDocument();
  });

  it('renders empty state when results are missing', () => {
    const originalResults = mockState.results;
    mockState.results = null as unknown as typeof mockState.results;

    render(<OptimizedStage />);
    expect(screen.getByText('optimizedView.shell.noResultsYet')).toBeInTheDocument();

    mockState.results = originalResults;
  });

  it('shows config details for objective/mode/budget variants and switches tabs', async () => {
    const user = userEvent.setup();

    mockState.config.blend = 0;
    mockState.config.mode = 'Retrospective';
    mockState.config.budgetMode = 'Unconstrained';

    const { rerender } = render(<OptimizedStage />);

    await user.click(screen.getByRole('button', { name: /optimizedView\.cards\.mode/i }));
    expect(screen.getByText('optimizedView.shell.profitOnly')).toBeInTheDocument();
    expect(screen.getByText('optimization.retrospective')).toBeInTheDocument();
    expect(screen.getByText('optimization.budget.unconstrained')).toBeInTheDocument();

    mockState.config.blend = 100;
    rerender(<OptimizedStage />);
    expect(screen.getByText('optimizedView.shell.revenueOnly')).toBeInTheDocument();

    mockState.config.blend = 50;
    rerender(<OptimizedStage />);
    expect(screen.getByText('optimizedView.shell.balancedProfit')).toBeInTheDocument();

    mockState.config.blend = 30;
    rerender(<OptimizedStage />);
    expect(screen.getByText('optimizedView.shell.mixedProfit')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'tabs.elasticity' }));
    expect(mockState.setOptimizedTab).toHaveBeenCalledWith('elasticity');
  });
});
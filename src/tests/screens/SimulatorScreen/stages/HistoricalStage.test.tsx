import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  histYear: 2025,
  historicalTab: 'portfolio' as 'portfolio' | 'trend',
  secondaryMetric: 'revenue',
  histTopN: 20 as 20 | 50 | 'all',
  trendSku: 'SKU-1',
  economics: 'tn' as 'tn' | 'legacy',
  historicalSummary: { n_skus_total: 2 },
  setHistYear: vi.fn(),
  setHistoricalTab: vi.fn(),
  setSecondaryMetric: vi.fn(),
  setHistTopN: vi.fn(),
  setTrendSku: vi.fn(),
  advanceTo: vi.fn(),
}));

const historyData = {
  n_skus_total: 2,
  totals: { n_skus: 2, revenue: 1000, profit: 500, spend: 250, return_per_kc: 1.5, volume_factor: 1.2 },
  portfolio: [
    { sku: 'SKU-1', band: 'HRTB', spend: 100, revenue: 200, profit: 100, return_per_kc: 1.5 },
    { sku: 'SKU-2', band: 'MRTB', spend: 150, revenue: 300, profit: 150, return_per_kc: 1.6 },
  ],
  weekly: {
    'SKU-1': [{ week: 1, spend: 10, revenue: 20, profit: 10, return_per_kc: 1.2 }],
  },
};

const historicalHookState = vi.hoisted(() => ({
  data: null as typeof historyData | null,
  isLoading: false,
  error: null as string | null,
}));

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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: { year?: number; weeks?: number; sku?: string; metric?: string; threshold?: number }) => {
    const map: Record<string, string> = {
      'tabs.portfolio': 'Portfolio',
      'tabs.skuTrend': 'SKU Trend',
      'filters.year': 'Year',
      'filters.topN': 'Top N',
      'filters.sku': 'SKU',
      'filters.secondaryMetric': 'Secondary metric',
      'actions.continueToConfiguration': 'Continue',
      'messages.reviewHistoricalPicture': 'Review',
      'common.loadingHistoricalData': 'Loading',
      'charts.skuTrendOverTime': 'Trend chart',
      'charts.weeklyPromoSpendVsSelectedMeasure': `Weekly ${opts?.year ?? ''}`,
      'charts.weeklyPromoSpendVsPromoRoiPercent': `ROI ${opts?.sku ?? ''}`,
      'charts.weeklyPromoSpendVsIncrementalUnits': `Units ${opts?.sku ?? ''}`,
      'charts.weeklyPromoSpendAndMetricSameAxisForSku': `Same axis ${opts?.sku ?? ''}`,
      'charts.noWeeklyDataAvailable': 'No data',
      'metrics.incrementalUnits': 'Incremental units',
      'metrics.promoRoiPercent': 'Promo ROI',
      'metrics.revenue': 'Revenue',
      'metrics.profit': 'Profit',
      'metrics.returnPerKc': 'Return / Kč',
      'common.loading': 'Loading',
      'optimizedView.calendar.discountDepth': 'Discount depth',
      'optimizedView.calendar.none': 'None',
      'optimizedView.calendar.deepDiscountThreshold': `Deep ${opts?.threshold ?? 0}`,
      'optimizedView.calendar.historicalVsOptimized': 'Compare',
      'optimizedView.calendar.promotionalCalendarWeeks': `Calendar ${opts?.weeks ?? 0}`,
      'optimizedView.calendar.optimized': 'Optimized',
      'optimizedView.calendar.historical': 'Historical',
      'optimizedView.calendar.compare': 'Compare',
      'optimizedView.calendar.compareWeekTooltip': 'Tooltip',
      'optimizedView.calendar.weekTooltip': 'Week tooltip',
      'optimizedView.calendar.weeklyPromoSpendVsSelectedMeasure': 'Weekly',
      'optimizedView.calendar.discountDepthFooterWithMetric': 'Footer',
      'optimizedView.calendar.priceElasticityAxisLabel': 'Axis',
      'optimizedView.calendar.promoSpendAxis': 'Spend axis',
    };
    return map[key] ?? key;
  } }),
}));

vi.mock('~/contexts/SimulatorContext', () => ({
  useSimulator: () => mockState,
}));

vi.mock('~/hooks/useHistorical', () => ({
  useHistorical: () => ({
    data: historicalHookState.data,
    isLoading: historicalHookState.isLoading,
    error: historicalHookState.error,
  }),
}));

import { HistoricalStage } from '~/screens/SimulatorScreen/stages/HistoricalStage';

beforeEach(() => {
  mockState.historicalTab = 'portfolio';
  mockState.secondaryMetric = 'revenue';
  mockState.trendSku = 'SKU-1';
  historicalHookState.data = historyData;
  historicalHookState.isLoading = false;
  historicalHookState.error = null;
});

afterEach(() => {
  cleanup();
  mockState.setHistYear.mockClear();
  mockState.setHistoricalTab.mockClear();
  mockState.setSecondaryMetric.mockClear();
  mockState.setHistTopN.mockClear();
  mockState.setTrendSku.mockClear();
  mockState.advanceTo.mockClear();
});

describe('HistoricalStage', () => {
  it('renders portfolio and trend views and continues to config', async () => {
    const user = userEvent.setup();

    render(<HistoricalStage />);

    expect(screen.getByText('charts.promoVolumeUpliftBySku')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'SKU Trend' }));
    expect(mockState.setHistoricalTab).toHaveBeenCalledWith('trend');

    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(mockState.advanceTo).toHaveBeenCalledWith('config');
  });

  it('shows loading and error indicators and disables continue while loading', () => {
    historicalHookState.data = null;
    historicalHookState.isLoading = true;
    historicalHookState.error = 'boom';

    render(<HistoricalStage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('renders trend-note variants for secondary metrics', async () => {
    const user = userEvent.setup();
    mockState.historicalTab = 'trend';
    mockState.secondaryMetric = 'return_per_kc';

    const { rerender } = render(<HistoricalStage />);
    expect(screen.getByText(/ROI SKU-1/i)).toBeInTheDocument();

    mockState.secondaryMetric = 'incr_units';
    rerender(<HistoricalStage />);
    expect(screen.getByText(/Units SKU-1/i)).toBeInTheDocument();

    mockState.secondaryMetric = 'profit';
    rerender(<HistoricalStage />);
    expect(screen.getByText(/Same axis SKU-1/i)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Secondary metric'), 'revenue');
    expect(mockState.setSecondaryMetric).toHaveBeenCalled();
  });

  it('syncs trend SKU when current selection is unavailable', () => {
    mockState.historicalTab = 'trend';
    mockState.trendSku = 'MISSING';

    render(<HistoricalStage />);

    expect(mockState.setTrendSku).toHaveBeenCalledWith('SKU-1');
  });

  it('auto-selects first available trend sku when none is selected', () => {
    mockState.historicalTab = 'trend';
    mockState.trendSku = null as unknown as string;

    render(<HistoricalStage />);

    expect(mockState.setTrendSku).toHaveBeenCalledWith('SKU-1');
  });

  it('executes first trend-sync branch when selected sku is falsy but options exist', () => {
    mockState.historicalTab = 'trend';
    mockState.trendSku = '';
    historicalHookState.data = historyData;

    const includesSpy = vi
      .spyOn(Array.prototype, 'includes')
      .mockImplementation(function patchedIncludes(this: string[], searchElement: string) {
        if (searchElement === '' && Array.prototype.indexOf.call(this, 'SKU-1') !== -1) {
          return true;
        }
        return Array.prototype.indexOf.call(this, searchElement) !== -1;
      });

    render(<HistoricalStage />);

    expect(mockState.setTrendSku).toHaveBeenCalledWith('SKU-1');

    includesSpy.mockRestore();
  });

  it('updates year and top-N controls in portfolio mode', async () => {
    const user = userEvent.setup();

    render(<HistoricalStage />);

    const yearSelects = screen.getAllByLabelText('Year');
    await user.selectOptions(yearSelects[0], '2024');
    expect(mockState.setHistYear).toHaveBeenCalledWith(2024);

    await user.selectOptions(screen.getByLabelText('Top N'), 'all');
    expect(mockState.setHistTopN).toHaveBeenCalledWith('all');
  });
});
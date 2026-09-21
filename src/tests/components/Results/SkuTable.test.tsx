import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { metric?: string; selected?: string; total?: number }) => {
      if (key === 'optimizedView.deepDive.baseMetric') return `Base ${opts?.metric ?? ''}`;
      if (key === 'optimizedView.deepDive.actualMetric') return `Actual ${opts?.metric ?? ''}`;
      if (key === 'optimizedView.deepDive.optimalMetric') return `Optimal ${opts?.metric ?? ''}`;
      if (key === 'descriptions.selectedOfTotal') return `${opts?.selected ?? ''} of ${opts?.total ?? ''}`;
      return key;
    },
  }),
}));

import { SkuTable } from '~/components/Results/SkuTable';
import type { SkuTableRow, WeeklyChart } from '~/types/simulation';

const weeklyChart: WeeklyChart = {
  weeks: [1],
  base: [1],
  actual: [1],
  optimal: [1],
};

const makeRow = (sku: string, gain: number, roi: number | null, actRoi: number | null): SkuTableRow => ({
  sku,
  base_profit: 100,
  act_profit: 90,
  opt_profit: 120,
  gain,
  act_promo_spend: 50,
  promo_spend: 60,
  confidence: 'high',
  roi,
  act_roi: actRoi,
  incr_units: Math.abs(gain),
});

describe('SkuTable', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({
        width: 900,
        height: 300,
        top: 0,
        left: 0,
        right: 900,
        bottom: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect,
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders chart and deep-dive table for turnover objective', () => {
    const rows = [makeRow('SKU-1', 40, 0.5, 0.4), makeRow('SKU-2', -20, -0.3, null)];

    render(<SkuTable rows={rows} weeklyChart={weeklyChart} objective="turnover" />);

    expect(screen.getByText('charts.optVolumeUplift')).toBeInTheDocument();
    expect(screen.getByText('Base metrics.revenue')).toBeInTheDocument();
    expect(screen.getByText('Actual metrics.revenue')).toBeInTheDocument();
    expect(screen.getByText('Optimal metrics.revenue')).toBeInTheDocument();

    expect(screen.getByText('+40')).toBeInTheDocument();
    expect(screen.getByText('-20')).toBeInTheDocument();
    expect(screen.getByText('0.50x')).toBeInTheDocument();
    expect(screen.getByText('optimizedView.deepDive.vs --')).toBeInTheDocument();
  });

  it('renders profit objective labels and tooltip on bar hover', () => {
    const rows = [makeRow('SKU-A', 100, 1.2, 0.2), makeRow('SKU-B', 0, null, null)];

    render(<SkuTable rows={rows} weeklyChart={weeklyChart} objective="profit" />);

    expect(screen.getByText('Base metrics.profit')).toBeInTheDocument();

    const bars = document.querySelectorAll('svg rect');
    expect(bars.length).toBeGreaterThanOrEqual(2);

    fireEvent.mouseEnter(bars[0], { clientX: 200, clientY: 120 });

    expect(screen.getAllByText('SKU-A').length).toBeGreaterThanOrEqual(2);
    const tooltip = document.querySelector('[style*="position: fixed"]');
    expect(tooltip?.textContent).toContain('charts.incrUnits');
    expect(tooltip?.textContent).toContain('optimizedView.deepDive.table.optimalSpend');
    expect(tooltip?.textContent).toContain('optimizedView.deepDive.table.promoRoi');
  });

  it('handles pagination controls when rows exceed page size', async () => {
    const user = userEvent.setup();
    const rows = Array.from({ length: 11 }, (_, index) =>
      makeRow(`SKU-${index + 1}`, 100 - index, 0.3, 0.2),
    );

    render(<SkuTable rows={rows} weeklyChart={weeklyChart} objective="profit" />);

    expect(screen.getByText('1-10 of 11')).toBeInTheDocument();

    const nextButton = screen.getByRole('button', { name: '›' });
    await user.click(nextButton);

    expect(screen.getByText('11-11 of 11')).toBeInTheDocument();
    expect(nextButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '‹' }));
    expect(screen.getByText('1-10 of 11')).toBeInTheDocument();
  });

  it('hides pagination when row count does not exceed page size', () => {
    const rows = [makeRow('SKU-1', 5, 0.1, 0.1)];

    render(<SkuTable rows={rows} weeklyChart={weeklyChart} objective="profit" />);

    expect(screen.queryByText(/of 1$/)).not.toBeInTheDocument();
  });
});

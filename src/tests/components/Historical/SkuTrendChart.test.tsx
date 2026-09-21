import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { SkuTrendChart } from '~/components/Historical/SkuTrendChart';

describe('SkuTrendChart', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows no-data note when rows are empty', () => {
    render(<SkuTrendChart rows={[]} secondary="profit" />);
    expect(screen.getByText('charts.noWeeklyDataAvailable')).toBeInTheDocument();
  });

  it('renders dual-axis mode for return_per_kc', () => {
    render(
      <SkuTrendChart
        secondary="return_per_kc"
        rows={[
          { week: 1, spend: 10, revenue: 30, profit: 12, return_per_kc: 0.4 },
          { week: 3, spend: 20, revenue: 42, profit: 15, return_per_kc: 0.5 },
        ]}
      />,
    );

    expect(screen.getAllByText('metrics.returnPerKc').length).toBeGreaterThan(0);
    expect(screen.getByText('charts.promoSpendAxis')).toBeInTheDocument();
  });

  it('renders single-axis mode for revenue metric', () => {
    render(
      <SkuTrendChart
        secondary="revenue"
        rows={[
          { week: 1, spend: 10, revenue: 30, profit: 12, return_per_kc: 0.4 },
          { week: 2, spend: 15, revenue: 36, profit: 13, return_per_kc: 0.45 },
        ]}
      />,
    );

    expect(screen.getByText('metrics.revenue')).toBeInTheDocument();
    expect(screen.getByText('Kč')).toBeInTheDocument();
  });

  it('renders dual-axis mode for incremental-units metric and zero-fills sparse weeks', () => {
    render(
      <SkuTrendChart
        secondary="incr_units"
        rows={[
          { week: 1, spend: 12, revenue: 30, profit: 10, return_per_kc: 0.4, incr_units: 5 },
          { week: 4, spend: 15, revenue: 36, profit: 11, return_per_kc: 0.45, incr_units: 3 },
        ]}
      />,
    );

    expect(screen.getAllByText('Incremental units').length).toBeGreaterThan(0);
    expect(screen.getAllByText('W1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('W3').length).toBeGreaterThan(0);
  });
});

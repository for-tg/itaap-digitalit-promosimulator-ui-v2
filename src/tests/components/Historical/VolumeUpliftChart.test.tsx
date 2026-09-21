import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { VolumeUpliftChart } from '~/components/Historical/VolumeUpliftChart';

describe('VolumeUpliftChart', () => {
  beforeEach(() => {
    let observerCallback: ((entries: Array<{ contentRect: { width: number } }>) => void) | null = null;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: (entries: Array<{ contentRect: { width: number } }>) => void) {
          observerCallback = cb;
        }
        observe() {
          observerCallback?.([{ contentRect: { width: 720 } }]);
        }
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders bars and shows tooltip on hover', () => {
    render(
      <VolumeUpliftChart
        rows={[
          { sku: 'SKU-A', band: 'LRTB', spend: 100, revenue: 200, profit: 90, return_per_kc: 0.5, incr_units: 30 },
          { sku: 'SKU-B', band: 'MRTB', spend: 80, revenue: 140, profit: 20, return_per_kc: -0.1, incr_units: 10 },
          { sku: 'SKU-C', band: 'HRTB', spend: 60, revenue: 80, profit: -10, return_per_kc: -0.4, incr_units: -5 },
        ]}
      />,
    );

    expect(screen.getByRole('img', { name: 'charts.promoVolumeUpliftBySku' })).toBeInTheDocument();
    expect(screen.getByText('SKU-A (L)')).toBeInTheDocument();
    expect(screen.getByText('SKU-B (M)')).toBeInTheDocument();
    expect(screen.getByText('SKU-C (H)')).toBeInTheDocument();

    const bar = document.querySelector('rect[opacity="0.85"]');
    expect(bar).not.toBeNull();

    fireEvent.mouseEnter(bar as Element, { clientX: 120, clientY: 90 });

    expect(screen.getByText('SKU-A')).toBeInTheDocument();
    expect(screen.getAllByText(/charts.incrUnits/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/optimizedView.deepDive.table.promoRoi/i).length).toBeGreaterThan(0);
  });

  it('uses totals override and handles zero or negative totals in KPI strip', () => {
    render(
      <VolumeUpliftChart
        rows={[
          { sku: 'SKU-Z', band: 'OTHER', spend: 50, revenue: 75, profit: 10, return_per_kc: -0.3, incr_units: 5, incremental: 12 },
        ]}
        totals={{
          n_skus: 1,
          revenue: 75,
          profit: 10,
          spend: 0,
          return_per_kc: 0,
          incremental: -10,
          incremental_units: 0,
          volume_factor: 1,
        }}
      />,
    );

    // totalUnits = 0 should render "+0" and cost-per-unit as em dash.
    expect(screen.getByText('+0')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('SKU-Z (OTHER)')).toBeInTheDocument();
  });

  it('renders safely with empty rows', () => {
    render(<VolumeUpliftChart rows={[]} />);
    expect(screen.getByRole('img', { name: 'charts.promoVolumeUpliftBySku' })).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});

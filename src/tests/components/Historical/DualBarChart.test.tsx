import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { DualBarChart } from '~/components/Historical/DualBarChart';

describe('DualBarChart', () => {
  beforeEach(() => {
    let observerCallback: ((entries: Array<{ contentRect: { width: number } }>) => void) | null = null;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: (entries: Array<{ contentRect: { width: number } }>) => void) {
          observerCallback = cb;
        }
        observe() {
          observerCallback?.([{ contentRect: { width: 760 } }]);
        }
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders with empty rows without crashing', () => {
    render(<DualBarChart rows={[]} secondary="profit" />);
    expect(screen.getByRole('img', { name: 'charts.portfolioChart' })).toBeInTheDocument();
  });

  it('renders bars and shows spend tooltip on hover', async () => {
    render(
      <DualBarChart
        secondary="profit"
        rows={[
          { sku: 'SKU-1', band: 'A', spend: 120, revenue: 200, profit: 70, return_per_kc: 1.2 },
          { sku: 'SKU-2', band: 'A', spend: 90, revenue: 150, profit: -20, return_per_kc: -0.5 },
        ]}
      />,
    );

    const bars = document.querySelectorAll('rect[style*="crosshair"]');
    expect(bars.length).toBeGreaterThan(1);

    // One SKU label is rendered on axis before hover.
    expect(screen.getAllByText('SKU-1')).toHaveLength(1);

    fireEvent.mouseEnter(bars[0]);

    // Hover renders an additional SKU label in tooltip.
    expect(await screen.findAllByText('SKU-1')).toHaveLength(2);
    expect(screen.getByText((content) => /metrics\.promoSpend\s*:\s*120/.test(content))).toBeInTheDocument();
  });

  it('uses return-per-kc labels when secondary metric is ROI', () => {
    render(
      <DualBarChart
        secondary="return_per_kc"
        rows={[
          { sku: 'SKU-1', band: 'A', spend: 60, revenue: 110, profit: 30, return_per_kc: 2.4 },
        ]}
      />,
    );

    expect(screen.getAllByText('metrics.returnPerKc').length).toBeGreaterThan(0);
    expect(screen.getByText('charts.returnAxis')).toBeInTheDocument();
  });

  it('shows metric tooltip and hides it on mouse leave', async () => {
    render(
      <DualBarChart
        secondary="profit"
        rows={[
          { sku: 'SKU-NEG', band: 'A', spend: 80, revenue: 100, profit: -12, return_per_kc: -0.2 },
        ]}
      />,
    );

    const bars = document.querySelectorAll('rect[style*="crosshair"]');
    expect(bars.length).toBe(2);

    fireEvent.mouseEnter(bars[1]);
    expect(await screen.findByText((content) => /profit\s*:\s*-12/i.test(content))).toBeInTheDocument();

    const group = bars[1].closest('g');
    expect(group).not.toBeNull();
    fireEvent.mouseLeave(group as Element);

    expect(screen.queryByText((content) => /profit\s*:\s*-12/i.test(content))).not.toBeInTheDocument();
  });

  it('handles tiny metric range and repositions tooltip within SVG bounds', async () => {
    let observerCallback: ((entries: Array<{ contentRect: { width: number } }>) => void) | null = null;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: (entries: Array<{ contentRect: { width: number } }>) => void) {
          observerCallback = cb;
        }
        observe() {
          observerCallback?.([{ contentRect: { width: 220 } }]);
        }
        disconnect() {}
      },
    );

    render(
      <DualBarChart
        secondary="unknown_metric"
        rows={[{ sku: 'SKU-EDGE', band: 'A', spend: 0, revenue: 0, profit: 0, return_per_kc: 0 }]}
      />,
    );

    const bars = document.querySelectorAll('rect[style*="crosshair"]');
    expect(bars.length).toBe(2);

    fireEvent.mouseEnter(bars[1]);
    expect(await screen.findAllByText('SKU-EDGE')).toHaveLength(2);
    expect(screen.getByText((content) => /unknown_metric\s*:\s*0/.test(content))).toBeInTheDocument();
  });
});

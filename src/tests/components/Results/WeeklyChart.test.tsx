import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { WeeklyChart } from '~/components/Results/WeeklyChart';

const baseProps = {
  selectedSkus: ['SKU-1', 'SKU-2'],
  metric: 'profit' as const,
  setMetric: vi.fn(),
  scope: 'all' as const,
  setScope: vi.fn(),
  skuSel: null,
  setSkuSel: vi.fn(),
  maximized: null as 'depth' | 'beta' | null,
  setMaximized: vi.fn(),
};

describe('WeeklyChart', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders no-data states when elasticity payload is empty', () => {
    render(
      <WeeklyChart
        {...baseProps}
        elasticity={{
          series: {},
          depth_curves_profit: {},
          depth_curves_revenue: {},
          weeks: [],
          obj_label: 'Profit',
        }}
      />,
    );

    expect(screen.getAllByText('common.noData').length).toBeGreaterThan(0);
  });

  it('supports scope/metric/maximize controls', () => {
    const setMetric = vi.fn();
    const setScope = vi.fn();
    const setMaximized = vi.fn();

    render(
      <WeeklyChart
        {...baseProps}
        setMetric={setMetric}
        setScope={setScope}
        setMaximized={setMaximized}
        elasticity={{
          series: {
            'SKU-1': [
              { week: 1, median: 1.2, min: 0.9, max: 1.5 },
              { week: 2, median: 1.1, min: 0.8, max: 1.4 },
            ],
          },
          depth_curves_profit: {
            'SKU-1': [
              { discount: 5, median: 1.1, min: 0.9, max: 1.3 },
              { discount: 10, median: 1.4, min: 1.1, max: 1.6 },
            ],
          },
          depth_curves_revenue: {
            'SKU-1': [
              { discount: 5, median: 2.1, min: 1.9, max: 2.3 },
              { discount: 10, median: 2.4, min: 2.2, max: 2.7 },
            ],
          },
          weeks: [1, 2],
          obj_label: 'Profit',
        }}
      />,
    );

    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: 'revenue' },
    });
    expect(setMetric).toHaveBeenCalled();

    const singleSkuBtns = screen.getAllByRole('button', {
      name: 'optimizedView.elasticity.singleSku',
    });
    fireEvent.click(singleSkuBtns[0]);
    expect(setScope).toHaveBeenCalledWith('sku');

    const maxBtns = screen.getAllByRole('button', { name: 'actions.maximize' });
    fireEvent.click(maxBtns[0]);
    expect(setMaximized).toHaveBeenCalledWith('depth');
  });

  it('falls back to the first valid result sku when the selected sku is stale', () => {
    render(
      <WeeklyChart
        {...baseProps}
        scope="sku"
        skuSel="SKU-X"
        elasticity={{
          series: {
            'SKU-1': [{ week: 1, median: 1, min: 0.8, max: 1.2 }],
          },
          depth_curves_profit: {
            'SKU-1': [{ discount: 5, median: 1, min: 0.8, max: 1.2 }],
          },
          depth_curves_revenue: {
            'SKU-1': [{ discount: 5, median: 2, min: 1.8, max: 2.2 }],
          },
          weeks: [1],
          obj_label: 'Profit',
        }}
      />,
    );

    expect(screen.getAllByDisplayValue('SKU-1').length).toBeGreaterThan(0);
    expect(screen.queryByText('No individual data — showing portfolio average')).not.toBeInTheDocument();
  });

  it('uses sku-specific depth and beta series when selected sku has data', () => {
    render(
      <WeeklyChart
        {...baseProps}
        scope="sku"
        skuSel="SKU-1"
        elasticity={{
          series: {
            'SKU-1': [
              { week: 1, median: 1.3, min: 1.0, max: 1.6 },
              { week: 2, median: 1.1, min: 0.9, max: 1.4 },
            ],
          },
          depth_curves_profit: {
            'SKU-1': [
              { discount: 5, median: 2.1, min: 1.7, max: 2.4 },
              { discount: 10, median: 2.8, min: 2.3, max: 3.1 },
            ],
          },
          depth_curves_revenue: {
            'SKU-1': [
              { discount: 5, median: 3.1, min: 2.7, max: 3.4 },
              { discount: 10, median: 3.7, min: 3.3, max: 4.0 },
            ],
          },
          weeks: [1, 2],
          obj_label: 'Profit',
        }}
      />,
    );

    expect(screen.getAllByDisplayValue('SKU-1').length).toBeGreaterThan(0);
    expect(screen.queryByText('No individual data — showing portfolio average')).not.toBeInTheDocument();
    expect(screen.getAllByText('W1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('5%').length).toBeGreaterThan(0);
  });

  it('renders beta-only maximized panel and toggles restore action', () => {
    const setMaximized = vi.fn();

    render(
      <WeeklyChart
        {...baseProps}
        maximized="beta"
        setMaximized={setMaximized}
        elasticity={{
          series: {
            'SKU-1': [
              { week: 1, median: 1.2, min: 1.0, max: 1.4 },
              { week: 2, median: 1.1, min: 0.9, max: 1.3 },
            ],
          },
          depth_curves_profit: {
            'SKU-1': [
              { discount: 5, median: 2.0, min: 1.8, max: 2.2 },
            ],
          },
          depth_curves_revenue: {
            'SKU-1': [
              { discount: 5, median: 3.0, min: 2.8, max: 3.2 },
            ],
          },
          weeks: [1, 2],
          obj_label: 'Profit',
        }}
      />,
    );

    expect(screen.queryByText('optimizedView.elasticity.discountDepthResponse')).not.toBeInTheDocument();
    expect(screen.getByText('optimizedView.elasticity.weeklyPriceElasticity')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'actions.restore' }));
    expect(setMaximized).toHaveBeenCalledWith(null);
  });

  it('renders depth-only maximized panel and toggles restore action', () => {
    const setMaximized = vi.fn();

    render(
      <WeeklyChart
        {...baseProps}
        maximized="depth"
        setMaximized={setMaximized}
        elasticity={{
          series: {
            'SKU-1': [
              { week: 1, median: 1.2, min: 1.0, max: 1.4 },
              { week: 2, median: 1.1, min: 0.9, max: 1.3 },
            ],
          },
          depth_curves_profit: {
            'SKU-1': [
              { discount: 5, median: 2.0, min: 1.8, max: 2.2 },
            ],
          },
          depth_curves_revenue: {
            'SKU-1': [
              { discount: 5, median: 3.0, min: 2.8, max: 3.2 },
            ],
          },
          weeks: [1, 2],
          obj_label: 'Profit',
        }}
      />,
    );

    expect(screen.getByText('optimizedView.elasticity.discountDepthResponse')).toBeInTheDocument();
    expect(screen.queryByText('optimizedView.elasticity.weeklyPriceElasticity')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'actions.restore' }));
    expect(setMaximized).toHaveBeenCalledWith(null);
  });

  it('triggers beta maximize action from non-maximized state', () => {
    const setMaximized = vi.fn();

    render(
      <WeeklyChart
        {...baseProps}
        setMaximized={setMaximized}
        elasticity={{
          series: {
            'SKU-1': [
              { week: 1, median: 1.2, min: 1.0, max: 1.4 },
            ],
          },
          depth_curves_profit: {
            'SKU-1': [
              { discount: 5, median: 2.0, min: 1.8, max: 2.2 },
            ],
          },
          depth_curves_revenue: {
            'SKU-1': [
              { discount: 5, median: 3.0, min: 2.8, max: 3.2 },
            ],
          },
          weeks: [1],
          obj_label: 'Profit',
        }}
      />,
    );

    const maxBtns = screen.getAllByRole('button', { name: 'actions.maximize' });
    fireEvent.click(maxBtns[1]);
    expect(setMaximized).toHaveBeenCalledWith('beta');
  });

  it('hides SKU selector when sku scope has no available sku options', () => {
    render(
      <WeeklyChart
        {...baseProps}
        metric="revenue"
        scope="sku"
        selectedSkus={[]}
        elasticity={{
          series: {},
          depth_curves_profit: {},
          depth_curves_revenue: {},
          weeks: [],
          obj_label: 'Revenue',
        }}
      />,
    );

    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBe(2);
    expect(screen.queryByDisplayValue('SKU-1')).not.toBeInTheDocument();
  });

  it('renders SKU selector in sku scope and updates selected SKU', () => {
    const setSkuSel = vi.fn();

    render(
      <WeeklyChart
        {...baseProps}
        scope="sku"
        skuSel="SKU-1"
        setSkuSel={setSkuSel}
        selectedSkus={['SKU-1', 'SKU-2']}
        elasticity={{
          series: {
            'SKU-1': [{ week: 1, median: 1.2, min: 1.0, max: 1.4 }],
            'SKU-2': [{ week: 1, median: 1.1, min: 0.9, max: 1.3 }],
          },
          depth_curves_profit: {
            'SKU-1': [{ discount: 5, median: 2.0, min: 1.8, max: 2.2 }],
            'SKU-2': [{ discount: 5, median: 1.8, min: 1.6, max: 2.0 }],
          },
          depth_curves_revenue: {
            'SKU-1': [{ discount: 5, median: 3.0, min: 2.8, max: 3.2 }],
            'SKU-2': [{ discount: 5, median: 2.7, min: 2.5, max: 2.9 }],
          },
          weeks: [1],
          obj_label: 'Profit',
        }}
      />,
    );

    const skuSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(skuSelect, { target: { value: 'SKU-2' } });
    expect(setSkuSel).toHaveBeenCalledWith('SKU-2');
  });

  it('uses per_sku payload for single sku selection from backend response shape', () => {
    const { rerender } = render(
      <WeeklyChart
        {...baseProps}
        scope="sku"
        skuSel="HX9911/09"
        selectedSkus={['HX9911/09', 'HX9911/17']}
        elasticity={{
          series: {
            HRTB: [{ week: 1, median: 1.5, min: 1.3, max: 1.7 }],
          },
          depth_curves_profit: {
            HRTB: [{ discount: 5, median: 0.4, min: 0.3, max: 0.5 }],
          },
          depth_curves_revenue: {
            HRTB: [{ discount: 5, median: 3.5, min: 3.2, max: 3.8 }],
          },
          weeks: [1],
          obj_label: 'Blended',
          sku_list: ['HX9911/09', 'HX9911/17'],
          per_sku: {
            'HX9911/09': {
              depth_profit: [{ discount: 5, median: 0.34, min: 0.05, max: 0.84 }],
              depth_revenue: [{ discount: 5, median: 3.68, min: 0.1, max: 5.66 }],
              beta_weekly: [{ week: 1, value: 1.64 }],
            },
            'HX9911/17': {
              depth_profit: [{ discount: 5, median: 0.25, min: 0.01, max: 1.57 }],
              depth_revenue: [{ discount: 5, median: 3.67, min: 0.56, max: 6.19 }],
              beta_weekly: [{ week: 1, value: 1.29 }],
            },
          },
        }}
      />,
    );

    expect(screen.getAllByText('W1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('5%').length).toBeGreaterThan(0);
    expect(screen.queryByText('No individual data — showing portfolio average')).not.toBeInTheDocument();

    rerender(
      <WeeklyChart
        {...baseProps}
        scope="sku"
        skuSel="HX9911/17"
        selectedSkus={['HX9911/09', 'HX9911/17']}
        elasticity={{
          series: {
            HRTB: [{ week: 1, median: 1.5, min: 1.3, max: 1.7 }],
          },
          depth_curves_profit: {
            HRTB: [{ discount: 5, median: 0.4, min: 0.3, max: 0.5 }],
          },
          depth_curves_revenue: {
            HRTB: [{ discount: 5, median: 3.5, min: 3.2, max: 3.8 }],
          },
          weeks: [1],
          obj_label: 'Blended',
          sku_list: ['HX9911/09', 'HX9911/17'],
          per_sku: {
            'HX9911/09': {
              depth_profit: [{ discount: 5, median: 0.34, min: 0.05, max: 0.84 }],
              depth_revenue: [{ discount: 5, median: 3.68, min: 0.1, max: 5.66 }],
              beta_weekly: [{ week: 1, value: 1.64 }],
            },
            'HX9911/17': {
              depth_profit: [{ discount: 5, median: 0.25, min: 0.01, max: 1.57 }],
              depth_revenue: [{ discount: 5, median: 3.67, min: 0.56, max: 6.19 }],
              beta_weekly: [{ week: 1, value: 1.29 }],
            },
          },
        }}
      />,
    );

    expect(screen.getAllByDisplayValue('HX9911/17').length).toBeGreaterThan(0);
  });

  it('shows depth fallback note when selected sku lacks revenue depth but has weekly data', () => {
    render(
      <WeeklyChart
        {...baseProps}
        metric="revenue"
        scope="sku"
        skuSel="HX9911/27"
        selectedSkus={['HX9911/09', 'HX9911/17', 'HX9911/27']}
        elasticity={{
          series: {
            HRTB: [{ week: 1, median: 1.5, min: 1.3, max: 1.7 }],
          },
          depth_curves_profit: {
            HRTB: [{ discount: 5, median: 0.4, min: 0.3, max: 0.5 }],
          },
          depth_curves_revenue: {
            HRTB: [{ discount: 5, median: 3.5, min: 3.2, max: 3.8 }],
          },
          weeks: [1],
          obj_label: 'Blended',
          pooled: {
            depth_revenue: [{ discount: 5, median: 3.5, min: 3.2, max: 3.8 }],
            beta_weekly: [{ week: 1, median: 1.5, min: 1.3, max: 1.7 }],
          },
          per_sku: {
            'HX9911/27': {
              beta_weekly: [{ week: 1, value: 1.41 }],
            },
          },
          sku_list: ['HX9911/09', 'HX9911/17', 'HX9911/27'],
        }}
      />,
    );

    expect(screen.getByText('optimizedView.elasticity.discountDepthResponse')).toBeInTheDocument();
    expect(screen.getAllByText('No individual data — showing portfolio average').length).toBeGreaterThan(0);
  });

  it('filters dropdown skus to elasticity result sku_list and ignores stale selectedSkus', () => {
    render(
      <WeeklyChart
        {...baseProps}
        scope="sku"
        skuSel="HX9911/27"
        selectedSkus={['HX9911/09', 'HX9911/17', 'HX9911/27']}
        elasticity={{
          series: {
            HRTB: [{ week: 1, median: 1.64, min: 1.64, max: 1.64 }],
          },
          depth_curves_profit: {
            HRTB: [{ discount: 5, median: 0.39, min: 0.39, max: 0.39 }],
          },
          depth_curves_revenue: {
            HRTB: [{ discount: 5, median: 3.62, min: 3.62, max: 3.62 }],
          },
          weeks: [1],
          obj_label: 'Profit',
          per_sku: {
            'HX9911/09': {
              depth_profit: [{ discount: 5, median: 0.34, min: 0.05, max: 0.84 }],
              depth_revenue: [{ discount: 5, median: 3.68, min: 0.1, max: 5.66 }],
              beta_weekly: [{ week: 1, value: 1.64 }],
            },
          },
          sku_list: ['HX9911/09'],
        }}
      />,
    );

    expect(screen.getAllByDisplayValue('HX9911/09').length).toBeGreaterThan(0);
    expect(screen.queryByDisplayValue('HX9911/27')).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'HX9911/17' })).not.toBeInTheDocument();
  });

  it('handles sparse weekly/depth arrays and long x-axis sampling', () => {
    const sparseDepth1 = Array.from({ length: 3 }, (_, i) => ({ discount: i + 1, median: i + 1, min: i, max: i + 2 }));
    const sparseDepth2 = Array.from({ length: 3 }, (_, i) => ({ discount: i + 1, median: i + 2, min: i + 1, max: i + 3 }));
    const sparseSeries1 = Array.from({ length: 3 }, (_, i) => ({ week: i + 1, median: i + 1, min: i, max: i + 2 }));
    const sparseSeries2 = Array.from({ length: 3 }, (_, i) => ({ week: i + 1, median: i + 2, min: i + 1, max: i + 3 }));
    delete (sparseDepth1 as Array<{ discount: number; median: number; min: number; max: number }>)[1];
    delete (sparseSeries1 as Array<{ week: number; median: number; min: number; max: number }>)[1];

    const { rerender } = render(
      <WeeklyChart
        {...baseProps}
        selectedSkus={['SKU-1', 'SKU-2']}
        elasticity={{
          series: {
            'SKU-1': sparseSeries1,
            'SKU-2': sparseSeries2,
          },
          depth_curves_profit: {
            'SKU-1': sparseDepth1,
            'SKU-2': sparseDepth2,
          },
          depth_curves_revenue: {
            'SKU-1': sparseDepth1,
            'SKU-2': sparseDepth2,
          },
          weeks: [1, 2, 3],
          obj_label: 'Profit',
        }}
      />,
    );

    expect(screen.getAllByText('1%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('W2').length).toBeGreaterThan(0);

    const longDepth = Array.from({ length: 13 }, (_, i) => ({ discount: i + 1, median: i + 1, min: i, max: i + 2 }));
    const longSeries = Array.from({ length: 13 }, (_, i) => ({ week: i + 1, median: i + 1, min: i, max: i + 2 }));
    rerender(
      <WeeklyChart
        {...baseProps}
        selectedSkus={['SKU-1']}
        elasticity={{
          series: { 'SKU-1': longSeries },
          depth_curves_profit: { 'SKU-1': longDepth },
          depth_curves_revenue: { 'SKU-1': longDepth },
          weeks: Array.from({ length: 13 }, (_, i) => i + 1),
          obj_label: 'Profit',
        }}
      />,
    );

    expect(screen.getByText('optimizedView.elasticity.weeklyPriceElasticity')).toBeInTheDocument();
  });
});

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

type RailCard = {
  label: string;
  value: string;
  delta: string;
  direction: 'gain' | 'loss' | 'flat';
};

const mockState = vi.hoisted(() => ({
  stage: 'historical' as 'historical' | 'config' | 'optimized',
  historicalSummary: null as null | {
    totals: {
      n_skus: number;
      revenue: number;
      profit: number;
      spend: number;
      volume_factor?: number;
    };
  },
  histYear: 2024,
  allSkus: [{ sku: 'SKU-1', band: 'A' }],
  config: { selectedSkus: ['SKU-1'] as string[] },
  economics: 'tn' as 'tn' | 'legacy',
  setEconomics: vi.fn(),
  railCards: null as RailCard[] | null,
}));

vi.mock('~/contexts/SimulatorContext', () => ({
  useSimulator: () => mockState,
}));

vi.mock('~/hooks/useFormatters', () => ({
  useRailCards: () => mockState.railCards,
  kc: (value: number) => `KC ${value}`,
}));

import { RailSidebar } from '~/components/Layout/RailSidebar';

afterEach(() => {
  cleanup();
  mockState.stage = 'historical';
  mockState.historicalSummary = null;
  mockState.histYear = 2024;
  mockState.allSkus = [{ sku: 'SKU-1', band: 'A' }];
  mockState.config = { selectedSkus: ['SKU-1'] };
  mockState.economics = 'tn';
  mockState.railCards = null;
  mockState.setEconomics.mockClear();
});

describe('RailSidebar', () => {
  it('renders historical KPI summary', async () => {
    const user = userEvent.setup();
    mockState.historicalSummary = {
      totals: {
        n_skus: 1,
        revenue: 1000,
        profit: 400,
        spend: 200,
        volume_factor: 1.2,
      },
    };

    render(<RailSidebar />);

    expect(screen.getByLabelText('descriptions.historicalKpiSummary')).toBeInTheDocument();
    expect(screen.getByText('METRICS.VOLUMEFACTOR')).toBeInTheDocument();
    expect(screen.getByText('KC 1000')).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox'), 'legacy');
    expect(mockState.setEconomics).toHaveBeenCalledWith('legacy');
  });

  it('renders optimized KPI summary with custom cards', () => {
    mockState.stage = 'optimized';
    mockState.railCards = [
      { label: 'Optimal profit', value: '10', delta: '+1', direction: 'gain' },
    ];

    render(<RailSidebar />);

    expect(screen.getByLabelText('descriptions.optimizedKpiSummary')).toBeInTheDocument();
    expect(screen.getByText('Optimal profit')).toBeInTheDocument();
    expect(screen.getByText('metrics.skusSelected')).toBeInTheDocument();
  });

  it('renders config-stage historical summary and fallback placeholders', async () => {
    const user = userEvent.setup();
    mockState.stage = 'config';
    mockState.historicalSummary = null;
    mockState.allSkus = [];

    render(<RailSidebar />);

    expect(screen.getByLabelText('descriptions.historicalKpiSummary')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getByText('…')).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox'), 'legacy');
    expect(mockState.setEconomics).toHaveBeenCalledWith('legacy');
  });

  it('renders optimized defaults when rail cards are absent', () => {
    mockState.stage = 'optimized';
    mockState.railCards = null;

    render(<RailSidebar />);

    expect(screen.getByText('metrics.optimalProfit')).toBeInTheDocument();
    expect(screen.getByText('metrics.optimalRevenue')).toBeInTheDocument();
    expect(screen.getByText('metrics.averageDiscountDepth')).toBeInTheDocument();
    expect(screen.getByText('metrics.returnPerKc')).toBeInTheDocument();
  });

  it('renders config-stage values when historical totals exist', () => {
    mockState.stage = 'config';
    mockState.historicalSummary = {
      totals: {
        n_skus: 5,
        revenue: 5000,
        profit: 1200,
        spend: 800,
        volume_factor: 1.35,
      },
    };

    render(<RailSidebar />);

    expect(screen.getByText(/^\+35\.0%$/)).toBeInTheDocument();
    expect(screen.getByText('descriptions.promoLiftVolume')).toBeInTheDocument();
    expect(screen.getByText('descriptions.allSkusYear')).toBeInTheDocument();
    expect(screen.getByText('descriptions.allSkus')).toBeInTheDocument();
  });

  it('renders optimized custom card with loss delta', () => {
    mockState.stage = 'optimized';
    mockState.railCards = [
      { label: 'Return / Kč', value: '0.85x', delta: '-12%', direction: 'loss' },
    ];

    render(<RailSidebar />);

    expect(screen.getByText('Return / Kč')).toBeInTheDocument();
    expect(screen.getByText('-12%')).toBeInTheDocument();
  });

  it('renders historical fallback placeholders when totals are unavailable', () => {
    mockState.stage = 'historical';
    mockState.historicalSummary = null;
    mockState.allSkus = [{ sku: 'SKU-1', band: 'A' }, { sku: 'SKU-2', band: 'B' }];

    render(<RailSidebar />);

    expect(screen.getByLabelText('descriptions.historicalKpiSummary')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getAllByText('common.loading').length).toBeGreaterThan(0);
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});

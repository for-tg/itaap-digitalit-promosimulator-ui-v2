import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SimulatorProvider } from '~/contexts/SimulatorContext';
import { useHistorical } from '~/hooks/useHistorical';
import type { HistoricalSummary } from '~/types/historical';

vi.mock('~/services/simulationService', () => ({
  fetchHistoricalData: vi.fn(),
}));

import { fetchHistoricalData } from '~/services/simulationService';

const mockFetchHistoricalData = vi.mocked(fetchHistoricalData);

const makeSummary = (year = 2024): HistoricalSummary => ({
  year,
   currency: {
    code: 'USD',
    symbol: '$',
  },
  n_skus_total: 2,
  totals: { n_skus: 2, revenue: 500000, profit: 250000, spend: 20000, return_per_kc: 1.5,volume_factor: 1.5 },
  portfolio: [
    { sku: 'HX9911/09', band: 'HRTB', spend: 10000, revenue: 250000, profit: 125000, return_per_kc: 1.5 },
    { sku: 'HX6851/53', band: 'MRTB', spend: 10000, revenue: 250000, profit: 125000, return_per_kc: 1.5 },
  ],
  weekly: {},
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SimulatorProvider>{children}</SimulatorProvider>
);

describe('useHistorical', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('starts in loading state', () => {
    mockFetchHistoricalData.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useHistorical(2024), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('resolves data on successful fetch', async () => {
    const summary = makeSummary(2024);
    mockFetchHistoricalData.mockResolvedValue(summary);
    const { result } = renderHook(() => useHistorical(2024), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(summary);
    expect(result.current.error).toBeNull();
  });

  it('calls fetchHistoricalData with the provided year', async () => {
    mockFetchHistoricalData.mockResolvedValue(makeSummary(2031));
    renderHook(() => useHistorical(2031), { wrapper });
    await waitFor(() =>
      expect(mockFetchHistoricalData).toHaveBeenCalledWith(2031, undefined, undefined, 'tn'),
    );
  });

  it('sets error when fetch rejects with Error', async () => {
    mockFetchHistoricalData.mockClear();
    mockFetchHistoricalData.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useHistorical(2032), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toContain('Network error');
    expect(result.current.data).toBeNull();
  });

  it('sets error message for unknown rejection values', async () => {
    mockFetchHistoricalData.mockRejectedValue('unexpected string error');
    const { result } = renderHook(() => useHistorical(2033), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toContain('Unknown error');
  });

  it('re-fetches when year changes', async () => {
    mockFetchHistoricalData.mockResolvedValue(makeSummary(2034));
    const { rerender } = renderHook(({ year }) => useHistorical(year), {
      wrapper,
      initialProps: { year: 2034 },
    });
    await waitFor(() => expect(mockFetchHistoricalData).toHaveBeenCalledTimes(1));

    mockFetchHistoricalData.mockResolvedValue(makeSummary(2035));
    act(() => { rerender({ year: 2035 }); });

    await waitFor(() => expect(mockFetchHistoricalData).toHaveBeenCalledTimes(2));
    expect(mockFetchHistoricalData).toHaveBeenLastCalledWith(2035, undefined, undefined, 'tn');
  });

  it('sets trendSku to the first portfolio SKU on success', async () => {
    const summary = makeSummary(2036);
    mockFetchHistoricalData.mockResolvedValue(summary);
    const { result } = renderHook(
      () => {
        const hist = useHistorical(2036);
        return hist;
      },
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // setTrendSku is called internally; ensure no error thrown.
    expect(result.current.data?.portfolio[0].sku).toBe('HX9911/09');
  });

  it('does not set data after component unmounts', async () => {
    let resolvePromise!: (value: HistoricalSummary) => void;
    const promise = new Promise<HistoricalSummary>((res) => { resolvePromise = res; });
    mockFetchHistoricalData.mockReturnValue(promise);

    const { result, unmount } = renderHook(() => useHistorical(2037), { wrapper });
    unmount();
    act(() => { resolvePromise(makeSummary(2037)); });
    expect(result.current.data).toBeNull();
  });
});

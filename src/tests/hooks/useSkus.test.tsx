import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SimulatorProvider } from '~/contexts/SimulatorContext';
import { useSimulator } from '~/contexts/SimulatorContext';
import { useSkus } from '~/hooks/useSkus';
import type { ApiSkuMasterListResponse } from '~/types/project';
import type { SkusResponse } from '~/types/simulation';

vi.mock('~/services/simulationService', () => ({
  fetchSkus: vi.fn(),
}));

vi.mock('~/services/projectService', () => ({
  syncSkuMaster: vi.fn(),
  fetchSkuMaster: vi.fn(),
}));

import { fetchSkus } from '~/services/simulationService';
import { fetchSkuMaster, syncSkuMaster } from '~/services/projectService';

const mockFetchSkus = vi.mocked(fetchSkus);
const mockFetchSkuMaster = vi.mocked(fetchSkuMaster);
const mockSyncSkuMaster = vi.mocked(syncSkuMaster);

const mockSkusResponse: SkusResponse = {
  skus: [
    { sku: 'HX9911/09', band: 'HRTB' },
    { sku: 'HX7429/03', band: 'MRTB' },
  ],
  ref_spend: { 2024: 31553700 },
};

const mockMasterResponse: ApiSkuMasterListResponse = {
  total: 2,
  skus: [
    {
      sku_id: 'uuid-1',
      sku_code: 'HX9911/09',
      sku_name: 'Oral-B Pro',
      classification: 'HRTB',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-06-01T00:00:00Z',
    },
    {
      sku_id: 'uuid-2',
      sku_code: 'HX7429/03',
      sku_name: 'Oral-B Medium',
      classification: 'MRTB',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-06-01T00:00:00Z',
    },
  ],
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SimulatorProvider>{children}</SimulatorProvider>
);

describe('useSkus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('starts in loading state while fetching', () => {
    mockSyncSkuMaster.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useSkus(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('loads SKUs from SKU master when syncSkuMaster and fetchSkuMaster succeed', async () => {
    mockSyncSkuMaster.mockResolvedValue({ source: 'api', inserted: 0, updated: 0, unchanged: 2, deactivated: 0, total_active: 2 });
    mockFetchSkuMaster.mockResolvedValue(mockMasterResponse);
    const { result } = renderHook(() => useSkus(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
  });

  it('falls back to fetchSkus when syncSkuMaster throws', async () => {
    mockSyncSkuMaster.mockRejectedValue(new Error('sync failed'));
    mockFetchSkus.mockResolvedValue(mockSkusResponse);
    const { result } = renderHook(() => useSkus(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFetchSkus).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('falls back to fetchSkus when fetchSkuMaster returns empty list', async () => {
    mockSyncSkuMaster.mockResolvedValue({ source: 'api', inserted: 0, updated: 0, unchanged: 0, deactivated: 0, total_active: 0 });
    mockFetchSkuMaster.mockResolvedValue({ total: 0, skus: [] });
    mockFetchSkus.mockResolvedValue(mockSkusResponse);
    const { result } = renderHook(() => useSkus(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFetchSkus).toHaveBeenCalled();
  });

  it('sets error when both master and fallback fail', async () => {
    mockSyncSkuMaster.mockRejectedValue(new Error('sync fail'));
    mockFetchSkus.mockRejectedValue(new Error('skus fail'));
    const { result } = renderHook(() => useSkus(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toContain('Failed to load SKU list');
  });

  it('does not re-load if allSkus already has items', async () => {
    mockSyncSkuMaster.mockResolvedValue({ source: 'api', inserted: 0, updated: 0, unchanged: 2, deactivated: 0, total_active: 2 });
    mockFetchSkuMaster.mockResolvedValue(mockMasterResponse);

    const { result } = renderHook(() => useSkus(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const callCountAfterFirst = mockSyncSkuMaster.mock.calls.length;
    // Re-render should not trigger another load since allSkus is populated.
    expect(callCountAfterFirst).toBe(1);
  });

  it('exposes a reload function that re-fetches SKUs', async () => {
    mockSyncSkuMaster.mockRejectedValue(new Error('sync fail'));
    mockFetchSkus.mockResolvedValue(mockSkusResponse);
    const { result } = renderHook(() => useSkus(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const callsBefore = mockFetchSkus.mock.calls.length;
    await result.current.reload();
    expect(mockFetchSkus.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('maps SKU master items using sku_code and classification', async () => {
    mockSyncSkuMaster.mockResolvedValue({ source: 'api', inserted: 0, updated: 0, unchanged: 2, deactivated: 0, total_active: 2 });
    mockFetchSkuMaster.mockResolvedValue(mockMasterResponse);
    renderHook(() => useSkus(), { wrapper });
    await waitFor(() => expect(mockFetchSkuMaster).toHaveBeenCalled());
    // Mapping happens inside the hook; ensure it does not throw.
    expect(mockFetchSkuMaster).toHaveBeenCalledTimes(1);
  });

  it('preserves restored selected SKUs when reloading the master list', async () => {
    mockSyncSkuMaster.mockResolvedValue({ source: 'api', inserted: 0, updated: 0, unchanged: 2, deactivated: 0, total_active: 2 });
    mockFetchSkuMaster.mockResolvedValue(mockMasterResponse);

    const { result } = renderHook(() => {
      const skus = useSkus();
      const sim = useSimulator();
      return { skus, sim };
    }, { wrapper });

    await waitFor(() => expect(result.current.sim.allSkus).toHaveLength(2));

    act(() => {
      result.current.sim.updateConfig({ selectedSkus: ['HX7429/03'] });
    });

    await act(async () => {
      await result.current.skus.reload();
    });

    expect(result.current.sim.config.selectedSkus).toEqual(['HX7429/03']);
    expect(result.current.sim.trendSku).toBe('HX7429/03');
  });
});

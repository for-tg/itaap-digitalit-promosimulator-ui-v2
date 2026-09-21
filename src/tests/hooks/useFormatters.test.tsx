import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SimulatorProvider, useSimulator } from '~/contexts/SimulatorContext';
import { kc, num, useAvgOptDepth, useRailCards } from '~/hooks/useFormatters';
import type { SimulationResponse } from '~/types/simulation';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SimulatorProvider>{children}</SimulatorProvider>
);

// Minimal SimulationResponse needed for formatter tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeResults = (overrides: Record<string, any> = {}): SimulationResponse =>
  ({
    status: 'ok',
    objective: 'profit',
    timeline: {
      'SKU-1': { codes: [1, 2, 3], opt_disc: [10, 0, 20], act_disc: [5, 0, 15] },
      'SKU-2': { codes: [1], opt_disc: [0], act_disc: [0] },
    },
    compare: {
      current: { turnover: 100000, profit: 50000, margin: 0.5, qty: 1000, promo_weeks: 10, promo_spend: 5000 },
      recommended: {
        turnover: 120000, profit: 65000, margin: 0.54, qty: 1100, promo_weeks: 12, promo_spend: 6000,
        effective_turnover: 115000, delta_effective_turnover: 15000, delta_effective_pct: 0.13,
      },
    },
    compare_vs_base: false,
    roi: { optimal: 2.5, actual: 2.0, per_quarter: {} },
    hero: {} as SimulationResponse['hero'],
    tiers: {} as SimulationResponse['tiers'],
    why_reasons: [],
    weekly_chart: { weeks: [], base: [], actual: [], optimal: [] },
    ...overrides,
  } as unknown as SimulationResponse);

describe('kc formatter', () => {
  it('formats a positive integer with thousand separator and Kč suffix', () => {
    expect(kc(12345)).toBe('12,345 Kč');
  });

  it('formats zero', () => {
    expect(kc(0)).toBe('0 Kč');
  });

  it('rounds a decimal value', () => {
    expect(kc(1234.7)).toBe('1,235 Kč');
  });

  it('formats a large number with multiple comma separators', () => {
    expect(kc(1000000)).toBe('1,000,000 Kč');
  });

  it('formats a negative number', () => {
    expect(kc(-500)).toBe('-500 Kč');
  });
});

describe('num formatter', () => {
  it('formats a positive integer with thousand separator', () => {
    expect(num(9876)).toBe('9,876');
  });

  it('formats zero', () => {
    expect(num(0)).toBe('0');
  });

  it('rounds a decimal before formatting', () => {
    expect(num(1234.4)).toBe('1,234');
  });

  it('formats a large number', () => {
    expect(num(1234567)).toBe('1,234,567');
  });
});

describe('useAvgOptDepth', () => {
  afterEach(cleanup);

  it('returns "0" when results is null', () => {
    const { result } = renderHook(() => useAvgOptDepth(), { wrapper });
    expect(result.current).toBe('0');
  });

  it('returns "0" when no timeline entries have positive opt_disc', () => {
    const { result } = renderHook(
      () => {
        const { setResults } = useSimulator();
        return { setResults, avg: useAvgOptDepth() };
      },
      { wrapper },
    );
    act(() => {
      result.current.setResults(makeResults({ timeline: { 'SKU-1': { codes: [1], opt_disc: [0], act_disc: [0] } } }));
    });
    expect(result.current.avg).toBe('0');
  });

  it('returns the correct average of positive opt_disc values', () => {
    const { result } = renderHook(
      () => {
        const { setResults } = useSimulator();
        return { setResults, avg: useAvgOptDepth() };
      },
      { wrapper },
    );
    // opt_disc has values [10, 20] as positives → avg = 15
    act(() => {
      result.current.setResults(
        makeResults({
          timeline: {
            'SKU-1': { codes: [1, 2, 3], opt_disc: [10, 0, 20], act_disc: [] },
          },
        }),
      );
    });
    expect(result.current.avg).toBe('15');
  });

  it('returns "0" when results has no timeline property', () => {
    const { result } = renderHook(
      () => {
        const { setResults } = useSimulator();
        return { setResults, avg: useAvgOptDepth() };
      },
      { wrapper },
    );
    act(() => {
      result.current.setResults(makeResults({ timeline: undefined }));
    });
    expect(result.current.avg).toBe('0');
  });
});

describe('useRailCards', () => {
  afterEach(cleanup);

  it('returns null when results is null', () => {
    const { result } = renderHook(() => useRailCards(), { wrapper });
    expect(result.current).toBeNull();
  });

  it('returns null when stage is not optimized', () => {
    const { result } = renderHook(
      () => {
        const { setResults } = useSimulator();
        return { setResults, cards: useRailCards() };
      },
      { wrapper },
    );
    act(() => {
      result.current.setResults(makeResults());
    });
    // stage is still 'historical' by default
    expect(result.current.cards).toBeNull();
  });

  it('returns 4 cards when stage is optimized and results are set', () => {
    const { result } = renderHook(
      () => {
        const { setResults, advanceTo } = useSimulator();
        return { setResults, advanceTo, cards: useRailCards() };
      },
      { wrapper },
    );
    act(() => {
      result.current.setResults(makeResults());
      result.current.advanceTo('optimized');
    });
    expect(result.current.cards).toHaveLength(4);
  });

  it('shows positive delta direction when recommended profit > current profit', () => {
    const { result } = renderHook(
      () => {
        const { setResults, advanceTo } = useSimulator();
        return { setResults, advanceTo, cards: useRailCards() };
      },
      { wrapper },
    );
    act(() => {
      result.current.setResults(
        makeResults({
          compare: {
            current: { turnover: 100000, profit: 50000, margin: 0.5, qty: 1000, promo_weeks: 10, promo_spend: 5000 },
            recommended: { turnover: 120000, profit: 65000, margin: 0.54, qty: 1100, promo_weeks: 12, promo_spend: 6000 },
          },
        }),
      );
      result.current.advanceTo('optimized');
    });
    expect(result.current.cards?.[0].direction).toBe('up');
  });

  it('shows down direction when recommended profit < current profit', () => {
    const { result } = renderHook(
      () => {
        const { setResults, advanceTo } = useSimulator();
        return { setResults, advanceTo, cards: useRailCards() };
      },
      { wrapper },
    );
    act(() => {
      result.current.setResults(
        makeResults({
          compare: {
            current: { turnover: 100000, profit: 70000, margin: 0.7, qty: 1000, promo_weeks: 10, promo_spend: 5000 },
            recommended: { turnover: 80000, profit: 50000, margin: 0.625, qty: 900, promo_weeks: 8, promo_spend: 4000 },
          },
        }),
      );
      result.current.advanceTo('optimized');
    });
    expect(result.current.cards?.[0].direction).toBe('down');
  });

  it('shows "—" for ROI when roi.optimal is null', () => {
    const { result } = renderHook(
      () => {
        const { setResults, advanceTo } = useSimulator();
        return { setResults, advanceTo, cards: useRailCards() };
      },
      { wrapper },
    );
    act(() => {
      result.current.setResults(makeResults({ roi: { optimal: null, actual: null, per_quarter: {} } }));
      result.current.advanceTo('optimized');
    });
    expect(result.current.cards?.[3].value).toBe('—');
  });

  it('uses no-promo label when compare_vs_base is true', () => {
    const { result } = renderHook(
      () => {
        const { setResults, advanceTo } = useSimulator();
        return { setResults, advanceTo, cards: useRailCards() };
      },
      { wrapper },
    );
    act(() => {
      result.current.setResults(makeResults({ compare_vs_base: true }));
      result.current.advanceTo('optimized');
    });
    expect(result.current.cards?.[0].delta).toContain('descriptions.noPromo');
  });
});

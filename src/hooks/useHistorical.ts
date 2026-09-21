import { useState, useEffect } from 'react';

import { fetchHistoricalData } from '~/services/simulationService';
import { useSimulator } from '~/contexts/SimulatorContext';
import type { HistoricalSummary, HistoricalTotals, PortfolioRow, WeeklyRow } from '~/types/historical';

export type { HistoricalSummary, HistoricalTotals, PortfolioRow, WeeklyRow };

// Session-scoped cache: survives component remounts, cleared on full page refresh.
const historicalCache = new Map<string, HistoricalSummary>();

export const useHistorical = (year: number, economics: 'tn' | 'legacy' = 'tn') => {
  const { setTrendSku, setHistoricalSummary } = useSimulator();
  const cacheKey = `${year}-${economics}`;
  const [data, setData] = useState<HistoricalSummary | null>(() => historicalCache.get(cacheKey) ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = historicalCache.get(cacheKey);
    if (cached) {
      setData(cached);
      setHistoricalSummary(cached);
      if (cached.portfolio[0]) setTrendSku(cached.portfolio[0].sku);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const summary = await fetchHistoricalData(year, undefined, undefined, economics);
        if (!cancelled) {
          historicalCache.set(cacheKey, summary);
          setData(summary);
          setHistoricalSummary(summary);
          if (summary.portfolio[0]) {
            setTrendSku(summary.portfolio[0].sku);
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          setError(`Could not load historical data: ${msg}`);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [cacheKey, year, economics, setTrendSku, setHistoricalSummary]);

  return { data, isLoading, error };
};

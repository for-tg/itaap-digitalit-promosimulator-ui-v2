import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SimulatorProvider, useSimulator } from '~/contexts/SimulatorContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SimulatorProvider>{children}</SimulatorProvider>
);

describe('SimulatorContext', () => {
  afterEach(cleanup);

  describe('useSimulator outside provider', () => {
    it('throws when called outside SimulatorProvider', () => {
      expect(() => renderHook(() => useSimulator())).toThrow(
        'useSimulator must be used inside SimulatorProvider',
      );
    });
  });

  describe('initial state', () => {
    it('stage defaults to historical', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      expect(result.current.stage).toBe('historical');
    });

    it('hasRun defaults to false', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      expect(result.current.hasRun).toBe(false);
    });

    it('isRunning defaults to false', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      expect(result.current.isRunning).toBe(false);
    });

    it('results defaults to null', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      expect(result.current.results).toBeNull();
    });

    it('allSkus defaults to empty array', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      expect(result.current.allSkus).toEqual([]);
    });

    it('config.mode defaults to Forward-looking', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      expect(result.current.config.mode).toBe('Forward-looking');
    });

    it('config.blend defaults to 50', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      expect(result.current.config.blend).toBe(50);
    });

    it('config.selectedSkus defaults to empty array', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      expect(result.current.config.selectedSkus).toEqual([]);
    });

    it('config.budgetMode defaults to Constrained', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      expect(result.current.config.budgetMode).toBe('Constrained');
    });

    it('historicalSummary defaults to null', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      expect(result.current.historicalSummary).toBeNull();
    });

    it('optimizedTab defaults to summary', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      expect(result.current.optimizedTab).toBe('summary');
    });
  });

  describe('jumpStage', () => {
    it('does not jump to optimized when hasRun is false and maxReached is 0', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => {
        result.current.jumpStage('optimized');
      });
      expect(result.current.stage).toBe('historical');
    });

    it('jumps to config stage when maxReached is at least 1', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => {
        result.current.advanceTo('config');
      });
      act(() => {
        result.current.jumpStage('historical');
      });
      expect(result.current.stage).toBe('historical');
    });

    it('allows free navigation after hasRun becomes true', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => {
        result.current.advanceTo('optimized');
      });
      act(() => {
        result.current.jumpStage('historical');
      });
      expect(result.current.stage).toBe('historical');
    });
  });

  describe('advanceTo', () => {
    it('sets stage to the target value', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => {
        result.current.advanceTo('config');
      });
      expect(result.current.stage).toBe('config');
    });

    it('updates maxReached when advancing to a later stage', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => {
        result.current.advanceTo('config');
      });
      expect(result.current.maxReached).toBe(1);
    });

    it('sets hasRun to true when advancing to optimized', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => {
        result.current.advanceTo('optimized');
      });
      expect(result.current.hasRun).toBe(true);
    });
  });

  describe('updateConfig', () => {
    it('merges a partial patch into the existing config', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => {
        result.current.updateConfig({ blend: 75 });
      });
      expect(result.current.config.blend).toBe(75);
    });

    it('does not overwrite unrelated config fields', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      const original = result.current.config.maxDiscount;
      act(() => {
        result.current.updateConfig({ blend: 30 });
      });
      expect(result.current.config.maxDiscount).toBe(original);
    });

    it('updates selectedSkus', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => {
        result.current.updateConfig({ selectedSkus: ['SKU-1', 'SKU-2'] });
      });
      expect(result.current.config.selectedSkus).toEqual(['SKU-1', 'SKU-2']);
    });
  });

  describe('setAllSkus', () => {
    it('sets the allSkus array', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => {
        result.current.setAllSkus([{ sku: 'HX1234/01', band: 'HRTB' }]);
      });
      expect(result.current.allSkus).toEqual([{ sku: 'HX1234/01', band: 'HRTB' }]);
    });
  });

  describe('setResults', () => {
    it('sets results to a provided value', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      const mockResults = { status: 'ok' } as Parameters<typeof result.current.setResults>[0];
      act(() => {
        result.current.setResults(mockResults);
      });
      expect(result.current.results).toEqual(mockResults);
    });

    it('clears results when set to null', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => {
        result.current.setResults(null);
      });
      expect(result.current.results).toBeNull();
    });
  });

  describe('setIsRunning', () => {
    it('toggles isRunning state', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => {
        result.current.setIsRunning(true);
      });
      expect(result.current.isRunning).toBe(true);
      act(() => {
        result.current.setIsRunning(false);
      });
      expect(result.current.isRunning).toBe(false);
    });
  });

  describe('historical UI setters', () => {
    it('setHistYear updates histYear', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => { result.current.setHistYear(2023); });
      expect(result.current.histYear).toBe(2023);
    });

    it('setHistoricalTab updates historicalTab', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => { result.current.setHistoricalTab('effectiveness'); });
      expect(result.current.historicalTab).toBe('effectiveness');
    });

    it('setSecondaryMetric updates secondaryMetric', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => { result.current.setSecondaryMetric('revenue'); });
      expect(result.current.secondaryMetric).toBe('revenue');
    });

    it('setHistTopN updates histTopN', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => { result.current.setHistTopN(50); });
      expect(result.current.histTopN).toBe(50);
    });

    it('setTrendSku updates trendSku', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => { result.current.setTrendSku('HX1234/01'); });
      expect(result.current.trendSku).toBe('HX1234/01');
    });

    // it('setHistoricalSummary updates historicalSummary', () => {
    //   const { result } = renderHook(() => useSimulator(), { wrapper });
    //   const summary = { year: 2024, n_skus_total: 5, totals: { n_skus: 5, revenue: 100, profit: 50, spend: 10, return_per_kc: 1, volume_factor: 1 }, portfolio: [], weekly: {} };
    //   act(() => { result.current.setHistoricalSummary(summary); });
    //   expect(result.current.historicalSummary).toEqual(summary);
    // });
  });

  describe('optimized UI setters', () => {
    it('setOptimizedTab updates optimizedTab', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => { result.current.setOptimizedTab('elasticity'); });
      expect(result.current.optimizedTab).toBe('elasticity');
    });

    it('setElasticMetric updates elasticMetric', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => { result.current.setElasticMetric('revenue'); });
      expect(result.current.elasticMetric).toBe('revenue');
    });

    it('setElasticScope updates elasticScope', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => { result.current.setElasticScope('sku'); });
      expect(result.current.elasticScope).toBe('sku');
    });

    it('setElasticSkuSel updates elasticSkuSel', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => { result.current.setElasticSkuSel('HX1234/01'); });
      expect(result.current.elasticSkuSel).toBe('HX1234/01');
    });

    it('setElasticMax updates elasticMax', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => { result.current.setElasticMax('depth'); });
      expect(result.current.elasticMax).toBe('depth');
    });

    it('setCalMode updates calMode', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => { result.current.setCalMode('actual'); });
      expect(result.current.calMode).toBe('actual');
    });

    it('setEconomics updates economics mode', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => { result.current.setEconomics('legacy'); });
      expect(result.current.economics).toBe('legacy');
    });
  });

  describe('resetConfig', () => {
    it('restores config defaults and repopulates selected SKUs from allSkus', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });

      act(() => {
        result.current.setAllSkus([
          { sku: 'SKU-1', band: 'A' },
          { sku: 'SKU-2', band: 'B' },
        ]);
        result.current.updateConfig({ selectedSkus: ['ONLY-ONE'], blend: 80 });
      });

      act(() => {
        result.current.resetConfig();
      });

      expect(result.current.config.blend).toBe(50);
      expect(result.current.config.selectedSkus).toEqual(['SKU-1', 'SKU-2']);
    });
  });

  describe('reset', () => {
    it('restores stage to historical', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => { result.current.advanceTo('optimized'); });
      act(() => { result.current.reset(); });
      expect(result.current.stage).toBe('historical');
    });

    it('clears hasRun', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => { result.current.advanceTo('optimized'); });
      act(() => { result.current.reset(); });
      expect(result.current.hasRun).toBe(false);
    });

    it('clears results', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => { result.current.setResults({ status: 'ok' } as Parameters<typeof result.current.setResults>[0]); });
      act(() => { result.current.reset(); });
      expect(result.current.results).toBeNull();
    });

    it('clears historicalSummary', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      const summary = { year: 2024, currency: {
    code: 'USD',
    symbol: '$',
  }, n_skus_total: 0, totals: { n_skus: 0, revenue: 0, profit: 0, spend: 0, return_per_kc: 0, volume_factor: 0 }, portfolio: [], weekly: {} };
      act(() => { result.current.setHistoricalSummary(summary); });
      act(() => { result.current.reset(); });
      expect(result.current.historicalSummary).toBeNull();
    });

    it('resets maxReached to 0', () => {
      const { result } = renderHook(() => useSimulator(), { wrapper });
      act(() => { result.current.advanceTo('optimized'); });
      act(() => { result.current.reset(); });
      expect(result.current.maxReached).toBe(0);
    });
  });
});

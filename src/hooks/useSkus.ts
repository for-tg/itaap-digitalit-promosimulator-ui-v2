import { useEffect, useCallback, useState } from 'react';

import { fetchSkus } from '~/services/simulationService';
import {
  getSkuMasterById,
  fetchSkuMaster,
  syncSkuMaster,
} from '~/services/projectService';
import { useSimulator } from '~/contexts/SimulatorContext';

export const useSkus = () => {
  const { allSkus, config, setAllSkus, updateConfig, setTrendSku } = useSimulator();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyLoadedSkus = useCallback((loadedSkus: Array<{ sku: string; band: string }>) => {
    setAllSkus(loadedSkus);

    const hasRestoredSelection = config.selectedSkus.length > 0;
    if (!hasRestoredSelection) {
      updateConfig({ selectedSkus: loadedSkus.map((sku) => sku.sku) });
    }

    const preferredTrendSku = config.selectedSkus.find((sku) =>
      loadedSkus.some((item) => item.sku === sku),
    ) ?? loadedSkus[0]?.sku;

    if (preferredTrendSku) {
      setTrendSku(preferredTrendSku);
    }
  }, [config.selectedSkus, setAllSkus, setTrendSku, updateConfig]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      try {
        await syncSkuMaster();
        const master = await fetchSkuMaster();
        const masterItems = [...master.skus];
        if (masterItems[0]) {
          try {
            const firstSkuDetail = await getSkuMasterById(masterItems[0].sku_id);
            masterItems[0] = {
              ...masterItems[0],
              classification:
                firstSkuDetail.classification ?? masterItems[0].classification,
            };
          } catch {
            // Keep list usable even if detail endpoint fails.
          }
        }

        const mappedSkus = masterItems.map((item) => ({
          sku: item.sku_code,
          band: item.classification ?? '',
        }));
        if (mappedSkus.length > 0) {
          applyLoadedSkus(mappedSkus);
          return;
        }
      } catch {
        // Fall back to the existing /api/skus endpoint.
      }

      const data = await fetchSkus();
      applyLoadedSkus(data.skus);
    } catch (err) {
      console.error('Failed to load SKUs:', err);
      setError('Failed to load SKU list. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  }, [applyLoadedSkus]);

  useEffect(() => {
    if (allSkus.length === 0) {
      void load();
    }
  }, [load, allSkus.length]);

  return { isLoading, error, reload: load };
};

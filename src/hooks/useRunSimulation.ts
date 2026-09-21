import { useCallback } from 'react';
import { useParams } from 'react-router-dom';

import { runRetro, runPlan } from '~/services/simulationService';
import {
  runScenarioOptimize,
  saveOptimizationResult,
  saveScenarioConfig,
} from '~/services/projectService';
import { useSimulator } from '~/contexts/SimulatorContext';
import { useProjects } from '~/contexts/ProjectsContext';
import type { ApiSaveScenarioConfigPayload } from '~/types/project';
import type { SimulationResponse } from '~/types/simulation';

export const useRunSimulation = () => {
  const {
    config,
    economics,
    setIsRunning,
    isRunning,
    setResults,
    advanceTo,
    updateConfig,
    allSkus,
  } = useSimulator();
  const { scenarioId, projectId } = useParams<{ projectId: string; scenarioId: string }>();
  const { updateScenarioStatusLocally } = useProjects();

  const getQuarterlySplitsPayload = useCallback(
    (): Record<string, number> => ({
      Q1: config.qSplit?.Q1 ?? 25,
      Q2: config.qSplit?.Q2 ?? 25,
      Q3: config.qSplit?.Q3 ?? 25,
      Q4: config.qSplit?.Q4 ?? 25,
    }),
    [config.qSplit],
  );

  const run = useCallback(async (): Promise<string | null> => {
    if (isRunning || config.selectedSkus.length === 0) return null;

    setIsRunning(true);
    const alpha = config.blend / 100;
    const alphaPayload = alpha === 0 ? null : alpha === 1 ? null : alpha;
    // API enum: 'profit' | 'turnover'  (blend < 50 → turnover, blend >= 50 → profit)
    const objective = config.blend < 50 ? 'turnover' : 'profit';
    const unconstrained = config.budgetMode === 'Unconstrained';
    const marginFloor = config.marginFloorOn ? config.marginFloor : 0;

    try {
      let response: SimulationResponse;

      if (!scenarioId) {
        // No-scenario path: call simulation APIs directly
        if (config.mode === 'Forward-looking') {
          response = await runPlan({
            skus: config.selectedSkus,
            plan_year: config.planYear,
            base_year: config.baseYear,
            use_trend: config.useTrend,
            economics,
            objective,
            max_discount: config.maxDiscount / 100,
            budget_multiplier: config.budgetMult / 100,
            ref_year: config.refYear,
            q_splits: { ...config.qSplit } as Record<string, number>,
            unconstrained,
            alpha: alphaPayload,
            margin_floor: marginFloor,
          });
        } else {
          response = await runRetro({
            skus: config.selectedSkus,
            year: config.year,
            period: config.period,
            economics,
            objective,
            max_discount: config.maxDiscount / 100,
            budget_multiplier: config.budgetMult / 100,
            ref_year: config.refYear,
            unconstrained,
            alpha: alphaPayload,
            margin_floor: marginFloor,
            allocation_mode: config.qSplitMode,
            q_splits:
              config.qSplitMode === 'custom'
                ? ({ ...config.qSplit } as Record<string, number>)
                : null,
          });
        }
      } else {
        // Saved-scenario path: persist config and let the backend optimize and store the result.
        const configPayload: ApiSaveScenarioConfigPayload = {
          analysis_type: config.mode === 'Retrospective' ? 'retro' : 'plan',
          selected_skus: config.selectedSkus,
          objective,
          year: config.mode === 'Retrospective' ? config.year : null,
          plan_year: config.mode === 'Forward-looking' ? config.planYear : null,
          base_year: config.mode === 'Forward-looking' ? config.baseYear : null,
          reference_year: config.refYear,
          economics,
          period: config.period,
          use_trend: config.useTrend,
          max_discount: config.maxDiscount / 100,
          budget_multiplier: config.budgetMult / 100,
          unconstrained,
          alpha: alphaPayload,
          margin_floor: marginFloor,
          allocation_mode: config.qSplitMode,
          quarterly_splits: getQuarterlySplitsPayload(),
        };
        await saveScenarioConfig(scenarioId, configPayload);
        const optimizeResponse = await runScenarioOptimize(scenarioId);
        response = optimizeResponse.result;

        // Keep optimization-result store in sync for consumers that read via GET endpoint.
        void saveOptimizationResult(scenarioId, response).catch(() => {
          // Non-blocking: optimization already succeeded.
        });
      }
      setResults(response);
      if (allSkus[0]) {
        updateConfig({ selectedSkus: config.selectedSkus });
      }
      advanceTo('optimized');

      // Reflect COMPLETED status immediately in the dashboard without waiting for a refresh
      if (projectId && scenarioId) {
        updateScenarioStatusLocally(projectId, scenarioId, 'COMPLETED');
      }

      return null;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Optimization failed';
      return msg;
    } finally {
      setIsRunning(false);
    }
  }, [
    config,
    economics,
    isRunning,
    scenarioId,
    projectId,
    setIsRunning,
    setResults,
    advanceTo,
    allSkus,
    updateConfig,
    updateScenarioStatusLocally,
    getQuarterlySplitsPayload,
  ]);

  return { run, isRunning };
};

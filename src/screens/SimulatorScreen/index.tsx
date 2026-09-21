import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { setActiveMarket } from '~/utils/apiClient';

import { useProjects } from '~/contexts/ProjectsContext';
import { useSimulator } from '~/contexts/SimulatorContext';
import { TopBar } from '~/components/Layout/TopBar';
import { Stepper } from '~/components/Layout/Stepper';
import { RailSidebar } from '~/components/Layout/RailSidebar';
import { ErrorBoundary } from '~/components/ErrorBoundary';
import { Loader } from '~/components/Loader';
import {
  getOptimizationResult,
  getProject,
  getScenario,
  getScenarioConfig,
} from '~/services/projectService';
import { fetchHistoricalData } from '~/services/simulationService';
import type { ApiScenarioConfig } from '~/types/project';
import type { SimulationResponse } from '~/types/simulation';
import { HistoricalStage } from './stages/HistoricalStage';
import { ConfigStage } from './stages/ConfigStage';
import { OptimizedStage } from './stages/OptimizedStage';
import styles from './styles.module.css';

export const SimulatorScreen = () => {
  const { t } = useTranslation();
  const { projectId, scenarioId } = useParams<{ projectId: string; scenarioId: string }>();
  const location = useLocation();
  const {
    projects,
    isLoading: projectsLoading,
    loadProjects,
    loadScenariosForProject,
  } = useProjects();
  const {
    stage,
    updateConfig,
    setResults,
    advanceTo,
    reset,
    histYear,
    setHistYear,
    historicalSummary,
    setHistoricalSummary,
    setEconomics,
    economics,
  } = useSimulator();
  const navigate = useNavigate();
  const isInSessionNavigation =
    Boolean((location.state as { fromDashboardClick?: boolean } | null)?.fromDashboardClick);
  const [scenariosReady, setScenariosReady] = useState(false);
  const [completedScenarioHydrated, setCompletedScenarioHydrated] = useState(false);
  // Prevent repeated historical API calls while switching stages.
  const historicalLoadedKeyRef = useRef<string | null>(null);
  const detailsRecoveryAttemptedRef = useRef(false);

  const project = projects.find((p) => p.id === projectId) ?? null;
  const scenario = project?.scenarios.find((s) => s.id === scenarioId) ?? null;
  const scenarioKey = scenario?.id;
  const scenarioStatus = scenario?.status;
  const isCompletedScenario = scenarioStatus === 'COMPLETED';

  useEffect(() => {
    if (project?.market) setActiveMarket(project.market);
  }, [project?.market]);

  const applySavedConfig = useCallback((savedConfig: ApiScenarioConfig) => {
    const blend =
      savedConfig.alpha != null
        ? Math.round(savedConfig.alpha * 100)
        : savedConfig.objective === 'profit'
          ? 100
          : savedConfig.objective === 'turnover' || savedConfig.objective === 'revenue'
            ? 0
            : 50;
    updateConfig({
      mode: savedConfig.analysis_type === 'retro' ? 'Retrospective' : 'Forward-looking',
      selectedSkus: savedConfig.selected_skus,
      blend,
      year: savedConfig.year ?? new Date().getFullYear() - 1,
      planYear: savedConfig.plan_year ?? new Date().getFullYear(),
      baseYear: savedConfig.base_year ?? new Date().getFullYear() - 1,
      period: savedConfig.period,
      useTrend: savedConfig.use_trend,
      maxDiscount: Math.round(savedConfig.max_discount * 100),
      budgetMult: Math.round(savedConfig.budget_multiplier * 100),
      budgetMode: savedConfig.unconstrained ? 'Unconstrained' : 'Constrained',
      marginFloor: savedConfig.margin_floor,
      marginFloorOn: savedConfig.margin_floor > 0,
      refYear: savedConfig.reference_year,
      qSplitMode: savedConfig.allocation_mode as 'actual' | 'custom',
      qSplit: savedConfig.quarterly_splits
        ? {
            Q1: savedConfig.quarterly_splits['Q1'] ?? 25,
            Q2: savedConfig.quarterly_splits['Q2'] ?? 25,
            Q3: savedConfig.quarterly_splits['Q3'] ?? 25,
            Q4: savedConfig.quarterly_splits['Q4'] ?? 25,
          }
        : { Q1: 25, Q2: 25, Q3: 25, Q4: 25 },
    });
    if (savedConfig.economics) {
      setEconomics(savedConfig.economics);
    }
    const restoredHistoricalYear =
      savedConfig.analysis_type === 'retro'
        ? savedConfig.year ?? savedConfig.reference_year
        : savedConfig.reference_year ?? savedConfig.year;
    setHistYear(restoredHistoricalYear);
  }, [setEconomics, setHistYear, updateConfig]);

  useEffect(() => {
    if (!isCompletedScenario) {
      setCompletedScenarioHydrated(true);
      return;
    }
    setCompletedScenarioHydrated(false);
  }, [scenarioKey, isCompletedScenario]);

  // Reset context to DEFAULT_CONFIG whenever the user leaves this screen,
  // so the next mount always starts clean regardless of navigation type.
  useEffect(() => {
    return () => { reset(); };
  }, [reset]);

  // Reset when browser restores page from bfcache (back/forward button).
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => { if (e.persisted) reset(); };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [reset]);

  // Ensure scenarios are fetched for this project (handles direct URL access / page refresh)
  useEffect(() => {
    if (projectsLoading || !project) return;
    void loadScenariosForProject(project.id).finally(() => setScenariosReady(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectsLoading, project?.id]);

  // Direct URL recovery: verify project/scenario ownership and then hydrate context once.
  useEffect(() => {
    if (projectsLoading || (project && scenario)) return;
    if (!projectId || !scenarioId) return;
    if (detailsRecoveryAttemptedRef.current) return;

    detailsRecoveryAttemptedRef.current = true;

    let cancelled = false;
    const recover = async () => {
      try {
        await Promise.all([getProject(projectId), getScenario(scenarioId)]);
        if (cancelled) return;
        await loadProjects();
        if (cancelled) return;
        await loadScenariosForProject(projectId);
        if (!cancelled) {
          setScenariosReady(true);
        }
      } catch {
        // Keep the existing not-found state when ownership checks fail.
      }
    };

    void recover();

    return () => {
      cancelled = true;
    };
  }, [
    loadProjects,
    loadScenariosForProject,
    project,
    projectId,
    projectsLoading,
    scenario,
    scenarioId,
  ]);

  // For COMPLETED scenarios: always restore saved config/results from the API.
  // Only auto-jump to the optimized stage when the user entered from an in-session dashboard click.
  useEffect(() => {
    if (!scenarioKey || scenarioStatus !== 'COMPLETED') return;
    let cancelled = false;
    const load = async () => {
      try {
        const [savedConfig, stored] = await Promise.all([
          getScenarioConfig(scenarioKey),
          getOptimizationResult(scenarioKey),
        ]);
        if (cancelled) return;
        if (savedConfig) applySavedConfig(savedConfig);
        if (stored?.result_json) {
          setResults(stored.result_json as unknown as SimulationResponse);
        }
        if (isInSessionNavigation) {
          advanceTo('optimized');
        }
      } catch {
        // partial failure: proceed with whatever loaded
      } finally {
        if (!cancelled) {
          setCompletedScenarioHydrated(true);
        }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [scenarioKey, scenarioStatus, isInSessionNavigation, applySavedConfig, setResults, advanceTo]);

  useEffect(() => {
    if (stage !== 'config') return;
    if (!scenarioKey) return;
    if (historicalSummary?.year !== histYear) return;
    historicalLoadedKeyRef.current = `${scenarioKey}:${histYear}:${economics}`;
  }, [stage, scenarioKey, historicalSummary?.year, histYear, economics]);

  // Load historical summary when entering Config stage if not already loaded
  // (handles when completed scenario bypasses Historical stage and jumps to Optimized)
  useEffect(() => {
    if (stage !== 'config') return;
    if (!scenarioKey) return;
    if (scenarioStatus !== 'COMPLETED') return;
    if (!completedScenarioHydrated) return;

    const key = `${scenarioKey}:${histYear}:${economics}`;
    if (historicalLoadedKeyRef.current === key) return;

    let cancelled = false;
    const load = async () => {
      try {
        const summary = await fetchHistoricalData(histYear, undefined, undefined, economics);
        if (!cancelled) {
          setHistoricalSummary(summary);
          historicalLoadedKeyRef.current = key;
        }
      } catch {
        // If historical data fails to load, continue with empty summary
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [stage, scenarioKey, scenarioStatus, completedScenarioHydrated, histYear, economics, setHistoricalSummary]);

  // Show loader while projects or scenario list are resolving
  if (projectsLoading || (project && !scenariosReady) || (isCompletedScenario && !completedScenarioHydrated)) {
    return <Loader />;
  }

  if (!project || !scenario) {
    return (
      <div className={styles.notFound}>
        <p>{t('errors.missingProjectScenario')}</p>
        <button onClick={() => { reset(); navigate('/projects'); }}>← {t('app.backToProjects')}</button>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <TopBar activeProject={project} activeScenario={scenario} />
      <Stepper />
      <div className={styles.content}>
        <RailSidebar />
        <main className={styles.main} role="main">
          <ErrorBoundary>
            {stage === 'historical' && <HistoricalStage />}
            {stage === 'config' && <ConfigStage />}
            {stage === 'optimized' && <OptimizedStage />}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

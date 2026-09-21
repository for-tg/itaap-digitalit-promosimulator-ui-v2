import {
  createContext,
  useContext,
  useState,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react';

import type { SimulationResponse, SkuItem } from '~/types/simulation';
import type { HistoricalSummary } from '~/types/historical';
import type { StageId } from '~/constants/simulator';
import { STAGE_IDS } from '~/constants/simulator';

export type AnalysisMode = 'Retrospective' | 'Forward-looking';
export type BudgetMode = 'Constrained' | 'Unconstrained';
export type QSplitMode = 'actual' | 'custom';
export type ElasticMetric = 'profit' | 'revenue';
export type ElasticScope = 'all' | 'sku';
export type CalMode = 'recommended' | 'actual' | 'compare';
export type HistoricalTab = 'effectiveness' | 'unitsasp';
export type OptimizedTab = 'summary' | 'elasticity' | 'promoeffectiveness' | 'calendar' | 'volume';
export type SecondaryMetric = 'incr_units' | 'return_per_kc' | 'revenue' | 'profit';
export type HistTopN = 20 | 50 | 'all';
export type EconomicsMode = 'tn' | 'legacy';

export interface QSplit {
  Q1: number;
  Q2: number;
  Q3: number;
  Q4: number;
}

interface SimulatorConfig {
  mode: AnalysisMode;
  year: number;
  planYear: number;
  baseYear: number;
  period: string;
  band: string;
  selectedSkus: string[];
  blend: number;
  maxDiscount: number;
  marginFloorOn: boolean;
  marginFloor: number;
  budgetMode: BudgetMode;
  budgetMult: number;
  refYear: number;
  qSplitMode: QSplitMode;
  qSplit: QSplit;
  useTrend: boolean;
  quarterFocus: string[]; // selected quarters, e.g. ['Q2','Q4']. empty = show all
}

interface SimulatorContextValue {
  // state
  allSkus: SkuItem[];
  stage: StageId;
  hasRun: boolean;
  maxReached: number;
  isRunning: boolean;
  config: SimulatorConfig;
  results: SimulationResponse | null;
  // historical data
  historicalSummary: HistoricalSummary | null;
  setHistoricalSummary: (d: HistoricalSummary | null) => void;
  // historical UI
  histYear: number;
  historicalTab: HistoricalTab;
  secondaryMetric: SecondaryMetric;
  histTopN: HistTopN;
  trendSku: string | null;
  // optimized UI
  optimizedTab: OptimizedTab;
  elasticMetric: ElasticMetric;
  elasticScope: ElasticScope;
  elasticSkuSel: string | null;
  elasticMax: 'depth' | 'beta' | null;
  calMode: CalMode;
  economics: EconomicsMode;
  // actions
  setAllSkus: (skus: SkuItem[]) => void;
  jumpStage: (stage: StageId) => void;
  advanceTo: (stage: StageId) => void;
  setIsRunning: (v: boolean) => void;
  setResults: (r: SimulationResponse | null) => void;
  updateConfig: (patch: Partial<SimulatorConfig>) => void;
  setHistYear: (y: number) => void;
  setHistoricalTab: (t: HistoricalTab) => void;
  setSecondaryMetric: (m: SecondaryMetric) => void;
  setHistTopN: (n: HistTopN) => void;
  setTrendSku: (s: string | null) => void;
  setOptimizedTab: (t: OptimizedTab) => void;
  setElasticMetric: (m: ElasticMetric) => void;
  setElasticScope: (s: ElasticScope) => void;
  setElasticSkuSel: (s: string | null) => void;
  setElasticMax: (v: 'depth' | 'beta' | null) => void;
  setCalMode: (m: CalMode) => void;
  setEconomics: (e: EconomicsMode) => void;
  reset: () => void;
  resetConfig: () => void;
}

const _now = new Date().getFullYear();
const _prev = _now - 1;

const DEFAULT_CONFIG: SimulatorConfig = {
  mode: 'Forward-looking',
  year: _prev,            // reference: previous year
  planYear: _now,         // planning year: current year
  baseYear: _prev,        // base template: previous year
  period: 'Full year',
  band: 'All',
  selectedSkus: [],       // all SKUs — populated on load
  blend: 50,              // Balanced objective
  maxDiscount: 25,        // 25%
  marginFloorOn: true,    // enabled by default
  marginFloor: 40,        // 40%
  budgetMode: 'Constrained',
  budgetMult: 100,        // 1.0x vs historical
  refYear: _prev,         // reference year: previous year
  qSplitMode: 'custom',   // 25/25/25/25 editable by default; user selects "Match last year" explicitly
  qSplit: { Q1: 25, Q2: 25, Q3: 25, Q4: 25 },
  useTrend: true,
  quarterFocus: [],
};

// ── UI display state managed by a single reducer ────────────────────────────
type UiState = {
  histYear: number;
  historicalTab: HistoricalTab;
  secondaryMetric: SecondaryMetric;
  histTopN: HistTopN;
  trendSku: string | null;
  optimizedTab: OptimizedTab;
  elasticMetric: ElasticMetric;
  elasticScope: ElasticScope;
  elasticSkuSel: string | null;
  elasticMax: 'depth' | 'beta' | null;
  calMode: CalMode;
  economics: EconomicsMode;
};

type UiAction =
  | { type: 'SET_HIST_YEAR'; year: number }
  | { type: 'SET_HISTORICAL_TAB'; tab: HistoricalTab }
  | { type: 'SET_SECONDARY_METRIC'; metric: SecondaryMetric }
  | { type: 'SET_HIST_TOP_N'; n: HistTopN }
  | { type: 'SET_TREND_SKU'; sku: string | null }
  | { type: 'SET_OPTIMIZED_TAB'; tab: OptimizedTab }
  | { type: 'SET_ELASTIC_METRIC'; metric: ElasticMetric }
  | { type: 'SET_ELASTIC_SCOPE'; scope: ElasticScope }
  | { type: 'SET_ELASTIC_SKU_SEL'; sku: string | null }
  | { type: 'SET_ELASTIC_MAX'; value: 'depth' | 'beta' | null }
  | { type: 'SET_CAL_MODE'; mode: CalMode }
  | { type: 'SET_ECONOMICS'; economics: EconomicsMode }
  | { type: 'RESET' };

const INITIAL_UI_STATE: UiState = {
  histYear: 2025,
  historicalTab: 'effectiveness',
  secondaryMetric: 'return_per_kc',
  histTopN: 20,
  trendSku: null,
  optimizedTab: 'summary',
  elasticMetric: 'profit',
  elasticScope: 'all',
  elasticSkuSel: null,
  elasticMax: null,
  calMode: 'compare',
  economics: 'tn',
};

function uiReducer(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case 'SET_HIST_YEAR':         return { ...state, histYear: action.year };
    case 'SET_HISTORICAL_TAB':    return { ...state, historicalTab: action.tab };
    case 'SET_SECONDARY_METRIC':  return { ...state, secondaryMetric: action.metric };
    case 'SET_HIST_TOP_N':        return { ...state, histTopN: action.n };
    case 'SET_TREND_SKU':         return { ...state, trendSku: action.sku };
    case 'SET_OPTIMIZED_TAB':     return { ...state, optimizedTab: action.tab };
    case 'SET_ELASTIC_METRIC':    return { ...state, elasticMetric: action.metric };
    case 'SET_ELASTIC_SCOPE':     return { ...state, elasticScope: action.scope };
    case 'SET_ELASTIC_SKU_SEL':   return { ...state, elasticSkuSel: action.sku };
    case 'SET_ELASTIC_MAX':       return { ...state, elasticMax: action.value };
    case 'SET_CAL_MODE':          return { ...state, calMode: action.mode };
    case 'SET_ECONOMICS':         return { ...state, economics: action.economics };
    case 'RESET':                 return INITIAL_UI_STATE;
    default:                      return state;
  }
}

const SimulatorContext = createContext<SimulatorContextValue | null>(null);

export const SimulatorProvider = ({ children }: { children: ReactNode }) => {
  const [allSkus, setAllSkus] = useState<SkuItem[]>([]);
  const [stage, setStage] = useState<StageId>('historical');
  const [hasRun, setHasRun] = useState(false);
  const [maxReached, setMaxReached] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState<SimulatorConfig>(DEFAULT_CONFIG);
  const [results, setResults] = useState<SimulationResponse | null>(null);
  const [historicalSummary, setHistoricalSummary] = useState<HistoricalSummary | null>(null);
  const [uiState, dispatchUi] = useReducer(uiReducer, INITIAL_UI_STATE);
  const { histYear, historicalTab, secondaryMetric, histTopN, trendSku, optimizedTab, elasticMetric, elasticScope, elasticSkuSel, elasticMax, calMode, economics } = uiState;

  const jumpStage = useCallback(
    (target: StageId) => {
      const idx = STAGE_IDS.indexOf(target);
      if (!hasRun && idx > maxReached) return;
      setStage(target);
    },
    [hasRun, maxReached]
  );

  const advanceTo = useCallback((target: StageId) => {
    const idx = STAGE_IDS.indexOf(target);
    setMaxReached((prev) => Math.max(prev, idx));
    setStage(target);
    if (target === 'optimized') setHasRun(true);
  }, []);

  const updateConfig = useCallback((patch: Partial<SimulatorConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const setHistYear = useCallback((y: number) => dispatchUi({ type: 'SET_HIST_YEAR', year: y }), []);
  const setHistoricalTab = useCallback((t: HistoricalTab) => dispatchUi({ type: 'SET_HISTORICAL_TAB', tab: t }), []);
  const setSecondaryMetric = useCallback((m: SecondaryMetric) => dispatchUi({ type: 'SET_SECONDARY_METRIC', metric: m }), []);
  const setHistTopN = useCallback((n: HistTopN) => dispatchUi({ type: 'SET_HIST_TOP_N', n }), []);
  const setTrendSku = useCallback((s: string | null) => dispatchUi({ type: 'SET_TREND_SKU', sku: s }), []);
  const setOptimizedTab = useCallback((t: OptimizedTab) => dispatchUi({ type: 'SET_OPTIMIZED_TAB', tab: t }), []);
  const setElasticMetric = useCallback((m: ElasticMetric) => dispatchUi({ type: 'SET_ELASTIC_METRIC', metric: m }), []);
  const setElasticScope = useCallback((s: ElasticScope) => dispatchUi({ type: 'SET_ELASTIC_SCOPE', scope: s }), []);
  const setElasticSkuSel = useCallback((s: string | null) => dispatchUi({ type: 'SET_ELASTIC_SKU_SEL', sku: s }), []);
  const setElasticMax = useCallback((v: 'depth' | 'beta' | null) => dispatchUi({ type: 'SET_ELASTIC_MAX', value: v }), []);
  const setCalMode = useCallback((m: CalMode) => dispatchUi({ type: 'SET_CAL_MODE', mode: m }), []);
  const setEconomics = useCallback((e: EconomicsMode) => dispatchUi({ type: 'SET_ECONOMICS', economics: e }), []);

  const reset = useCallback(() => {
    setStage('historical');
    setHasRun(false);
    setMaxReached(0);
    setIsRunning(false);
    setResults(null);
    setConfig(DEFAULT_CONFIG);
    setHistoricalSummary(null);
    dispatchUi({ type: 'RESET' });
  }, []);

  const resetConfig = useCallback(() => {
    setConfig({
      ...DEFAULT_CONFIG,
      selectedSkus: allSkus.map((s) => s.sku), // restore all available SKUs
    });
  }, [allSkus]);

  return (
    <SimulatorContext.Provider
      value={{
        allSkus,
        stage,
        hasRun,
        historicalSummary,
        setHistoricalSummary,
        maxReached,
        isRunning,
        config,
        results,
        histYear,
        historicalTab,
        secondaryMetric,
        histTopN,
        trendSku,
        optimizedTab,
        elasticMetric,
        elasticScope,
        elasticSkuSel,
        elasticMax,
        calMode,
        economics,
        setAllSkus,
        jumpStage,
        advanceTo,
        setIsRunning,
        setResults,
        updateConfig,
        setHistYear,
        setHistoricalTab,
        setSecondaryMetric,
        setHistTopN,
        setTrendSku,
        setOptimizedTab,
        setElasticMetric,
        setElasticScope,
        setElasticSkuSel,
        setElasticMax,
        setCalMode,
        setEconomics,
        reset,
        resetConfig,
      }}
    >
      {children}
    </SimulatorContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSimulator = (): SimulatorContextValue => {
  const ctx = useContext(SimulatorContext);
  if (!ctx) throw new Error('useSimulator must be used inside SimulatorProvider');
  return ctx;
};

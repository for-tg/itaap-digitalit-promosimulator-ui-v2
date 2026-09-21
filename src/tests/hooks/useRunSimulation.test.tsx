import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { SimulatorProvider, useSimulator } from '~/contexts/SimulatorContext';
import { useRunSimulation } from '~/hooks/useRunSimulation';
import type { SimulationResponse } from '~/types/simulation';

vi.mock('~/services/simulationService', () => ({
  runRetro: vi.fn(),
  runPlan: vi.fn(),
}));

vi.mock('~/services/projectService', () => ({
  saveScenarioConfig: vi.fn(),
  runScenarioOptimize: vi.fn(),
  saveOptimizationResult: vi.fn(),
}));

vi.mock('~/utils/appConfig', () => ({
  appConfigs: { ENABLE_SSO: false },
}));

const projectMocks = vi.hoisted(() => ({
  updateScenarioStatusLocally: vi.fn(),
}));

vi.mock('~/contexts/ProjectsContext', () => ({
  useProjects: () => ({ updateScenarioStatusLocally: projectMocks.updateScenarioStatusLocally }),
}));

import { runPlan, runRetro } from '~/services/simulationService';
import { runScenarioOptimize, saveOptimizationResult, saveScenarioConfig } from '~/services/projectService';

const mockRunRetro = vi.mocked(runRetro);
const mockRunPlan = vi.mocked(runPlan);
const mockSaveScenarioConfig = vi.mocked(saveScenarioConfig);
const mockRunScenarioOptimize = vi.mocked(runScenarioOptimize);
const mockSaveOptimizationResult = vi.mocked(saveOptimizationResult);

const MOCK_SIMULATION_RESPONSE = {
  status: 'ok',
  objective: 'profit',
  hero: {},
  tiers: {},
  why_reasons: [],
  compare: {},
  compare_vs_base: true,
  quarterly_allocation: {},
  quarterly_actual: {},
  quarterly_envelopes: {},
  timeline: {},
  weekly_chart: {},
  deep_dive: {},
  elasticity: {},
  roi: {},
  prelaunch: {},
  volume_factor: 1,
  volume_factor_actual: 1,
} as unknown as SimulationResponse;

/** Wrapper that routes to a path with projectId + scenarioId params. */
const WithScenario = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/project/proj-1/scenario/scen-1']}>
    <Routes>
      <Route
        path="/project/:projectId/scenario/:scenarioId"
        element={<SimulatorProvider>{children}</SimulatorProvider>}
      />
    </Routes>
  </MemoryRouter>
);

const WithoutScenarioWithSeed = ({ children }: { children: React.ReactNode }) => {
  const [seeded, setSeeded] = React.useState(false);

  return (
    <MemoryRouter initialEntries={['/project/proj-1']}>
      <Routes>
        <Route
          path="/project/:projectId"
          element={
            <SimulatorProvider>
              <NoScenarioSeeder onSeeded={() => setSeeded(true)} />
              {seeded && children}
            </SimulatorProvider>
          }
        />
      </Routes>
    </MemoryRouter>
  );
};

const NoScenarioSeeder = ({ onSeeded }: { onSeeded: () => void }) => {
  const { updateConfig } = useSimulator();

  React.useEffect(() => {
    updateConfig({
      selectedSkus: ['HX9911/09', 'HX7429/03'],
      mode: 'Retrospective',
      qSplitMode: 'custom',
      qSplit: { Q1: 10, Q2: 20, Q3: 30, Q4: 40 },
      blend: 0,
      budgetMode: 'Unconstrained',
      marginFloorOn: false,
      marginFloor: 5,
      maxDiscount: 25,
      budgetMult: 100,
      year: 2025,
      period: 'fullYear',
      refYear: 2024,
      useTrend: true,
      planYear: 2026,
      baseYear: 2024,
    });
    onSeeded();
  // Run once on mount only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

/** Wrapper that seeds selected SKUs before running the hook under test. */
const WithSkusAndScenario = ({ children }: { children: React.ReactNode }) => {
  const [seeded, setSeeded] = React.useState(false);

  return (
    <MemoryRouter initialEntries={['/project/proj-1/scenario/scen-1']}>
      <Routes>
        <Route
          path="/project/:projectId/scenario/:scenarioId"
          element={
            <SimulatorProvider>
              <SkuSeeder onSeeded={() => setSeeded(true)} />
              {seeded && children}
            </SimulatorProvider>
          }
        />
      </Routes>
    </MemoryRouter>
  );
};

const SkuSeeder = ({ onSeeded }: { onSeeded: () => void }) => {
  const { updateConfig } = useSimulator();
  React.useEffect(() => {
    updateConfig({ selectedSkus: ['HX9911/09', 'HX7429/03'], mode: 'Retrospective' });
    onSeeded();
  // Run once on mount only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

describe('useRunSimulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    projectMocks.updateScenarioStatusLocally.mockReset();
    mockSaveOptimizationResult.mockResolvedValue(undefined as never);
  });

  afterEach(cleanup);

  it('exposes a run function and isRunning flag', () => {
    const { result } = renderHook(() => useRunSimulation(), { wrapper: WithScenario });
    expect(typeof result.current.run).toBe('function');
    expect(result.current.isRunning).toBe(false);
  });

  it('returns null without calling services when no SKUs are selected', async () => {
    const { result } = renderHook(() => useRunSimulation(), { wrapper: WithScenario });
    let returnValue: string | null = 'unset';
    await act(async () => {
      returnValue = await result.current.run();
    });
    expect(returnValue).toBeNull();
    expect(mockRunRetro).not.toHaveBeenCalled();
    expect(mockRunPlan).not.toHaveBeenCalled();
  });

  it('sets isRunning back to false after the run completes', async () => {
    const { result } = renderHook(() => useRunSimulation(), { wrapper: WithScenario });
    await act(async () => { await result.current.run(); });
    expect(result.current.isRunning).toBe(false);
  });

  it('calls saveScenarioConfig + runScenarioOptimize in Retro mode', async () => {
    mockSaveScenarioConfig.mockResolvedValue({} as Awaited<ReturnType<typeof saveScenarioConfig>>);
    mockRunScenarioOptimize.mockResolvedValue({
      scenario_id: 'scen-1',
      status: 'COMPLETED',
      result: MOCK_SIMULATION_RESPONSE,
      created_at: '2026-08-25T10:10:00Z',
      updated_at: '2026-08-25T10:10:00Z',
    });

    const { result } = renderHook(() => useRunSimulation(), { wrapper: WithSkusAndScenario });
    await waitFor(() => expect(result.current.isRunning).toBe(false));
    await act(async () => { await result.current.run(); });

    expect(mockSaveScenarioConfig).toHaveBeenCalledWith('scen-1', expect.objectContaining({ analysis_type: 'retro' }));
    expect(mockRunRetro).not.toHaveBeenCalled();
    expect(mockRunScenarioOptimize).toHaveBeenCalledWith('scen-1');
  });

  it('calls runPlan when mode is Forward-looking', async () => {
    mockSaveScenarioConfig.mockResolvedValue({} as Awaited<ReturnType<typeof saveScenarioConfig>>);
    mockRunScenarioOptimize.mockResolvedValue({
      scenario_id: 'scen-1',
      status: 'COMPLETED',
      result: MOCK_SIMULATION_RESPONSE,
      created_at: '2026-08-25T10:10:00Z',
      updated_at: '2026-08-25T10:10:00Z',
    });

    const WithForwardLooking = ({ children }: { children: React.ReactNode }) => {
      const [seeded, setSeeded] = React.useState(false);
      return (
        <MemoryRouter initialEntries={['/project/proj-1/scenario/scen-1']}>
          <Routes>
            <Route
              path="/project/:projectId/scenario/:scenarioId"
              element={
                <SimulatorProvider>
                  <ForwardSeeder onSeeded={() => setSeeded(true)} />
                  {seeded && children}
                </SimulatorProvider>
              }
            />
          </Routes>
        </MemoryRouter>
      );
    };

    const ForwardSeeder = ({ onSeeded }: { onSeeded: () => void }) => {
      const { updateConfig } = useSimulator();
      React.useEffect(() => {
        updateConfig({ selectedSkus: ['HX9911/09'], mode: 'Forward-looking' });
        onSeeded();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    };

    const { result } = renderHook(() => useRunSimulation(), { wrapper: WithForwardLooking });
    await waitFor(() => expect(result.current.isRunning).toBe(false));
    await act(async () => { await result.current.run(); });

    expect(mockRunScenarioOptimize).toHaveBeenCalledWith('scen-1');
    expect(mockRunPlan).not.toHaveBeenCalled();
    expect(mockRunRetro).not.toHaveBeenCalled();
  });

  it('returns error message string when a service throws', async () => {
    mockSaveScenarioConfig.mockRejectedValue(new Error('Server 500'));

    const { result } = renderHook(() => useRunSimulation(), { wrapper: WithSkusAndScenario });
    await waitFor(() => expect(result.current.isRunning).toBe(false));

    let errorMsg: string | null = null;
    await act(async () => { errorMsg = await result.current.run(); });

    expect(errorMsg).toBe('Server 500');
    expect(result.current.isRunning).toBe(false);
  });

  it('returns "Optimization failed" for non-Error rejection values', async () => {
    mockSaveScenarioConfig.mockRejectedValue('plain-string-error');

    const { result } = renderHook(() => useRunSimulation(), { wrapper: WithSkusAndScenario });
    await waitFor(() => expect(result.current.isRunning).toBe(false));

    let errorMsg: string | null = null;
    await act(async () => { errorMsg = await result.current.run(); });

    expect(errorMsg).toBe('Optimization failed');
  });

  it('advances stage to optimized on successful run', async () => {
    mockSaveScenarioConfig.mockResolvedValue({} as Awaited<ReturnType<typeof saveScenarioConfig>>);
    mockRunScenarioOptimize.mockResolvedValue({
      scenario_id: 'scen-1',
      status: 'COMPLETED',
      result: MOCK_SIMULATION_RESPONSE,
      created_at: '2026-08-25T10:10:00Z',
      updated_at: '2026-08-25T10:10:00Z',
    });

    const WrapperWithRecorder = ({ children }: { children: React.ReactNode }) => {
      const [seeded, setSeeded] = React.useState(false);
      return (
        <MemoryRouter initialEntries={['/project/proj-1/scenario/scen-1']}>
          <Routes>
            <Route
              path="/project/:projectId/scenario/:scenarioId"
              element={
                <SimulatorProvider>
                  <SkuSeeder onSeeded={() => setSeeded(true)} />
                  {seeded && children}
                </SimulatorProvider>
              }
            />
          </Routes>
        </MemoryRouter>
      );
    };

    const { result } = renderHook(() => useRunSimulation(), { wrapper: WrapperWithRecorder });
    await waitFor(() => expect(result.current.isRunning).toBe(false));
    await act(async () => { await result.current.run(); });

    expect(mockRunScenarioOptimize).toHaveBeenCalledWith('scen-1');
    expect(mockSaveScenarioConfig).toHaveBeenCalled();
    expect(mockSaveOptimizationResult).toHaveBeenCalledWith('scen-1', MOCK_SIMULATION_RESPONSE);
    expect(projectMocks.updateScenarioStatusLocally).toHaveBeenCalledWith('proj-1', 'scen-1', 'COMPLETED');
  });

  it('calls runRetro directly when scenarioId is missing and uses custom allocation payload', async () => {
    mockRunRetro.mockResolvedValue(MOCK_SIMULATION_RESPONSE);

    const { result } = renderHook(() => useRunSimulation(), { wrapper: WithoutScenarioWithSeed });
    await waitFor(() => expect(result.current.isRunning).toBe(false));

    await act(async () => {
      await result.current.run();
    });

    expect(mockRunRetro).toHaveBeenCalledWith(expect.objectContaining({
      allocation_mode: 'custom',
      q_splits: { Q1: 10, Q2: 20, Q3: 30, Q4: 40 },
      objective: 'turnover',
      unconstrained: true,
      alpha: null,
      margin_floor: 0,
    }));
    expect(mockRunPlan).not.toHaveBeenCalled();
    expect(mockSaveScenarioConfig).not.toHaveBeenCalled();
    expect(projectMocks.updateScenarioStatusLocally).not.toHaveBeenCalled();
  });

  it('calls runPlan directly when scenarioId is missing and mode is Forward-looking', async () => {
    mockRunPlan.mockResolvedValue(MOCK_SIMULATION_RESPONSE);

    const ForwardNoScenarioWrapper = ({ children }: { children: React.ReactNode }) => {
      const [seeded, setSeeded] = React.useState(false);
      return (
        <MemoryRouter initialEntries={['/project/proj-1']}>
          <Routes>
            <Route
              path="/project/:projectId"
              element={
                <SimulatorProvider>
                  <ForwardNoScenarioSeeder onSeeded={() => setSeeded(true)} />
                  {seeded && children}
                </SimulatorProvider>
              }
            />
          </Routes>
        </MemoryRouter>
      );
    };

    const ForwardNoScenarioSeeder = ({ onSeeded }: { onSeeded: () => void }) => {
      const { updateConfig } = useSimulator();
      React.useEffect(() => {
        updateConfig({
          selectedSkus: ['HX9911/09'],
          mode: 'Forward-looking',
          blend: 100,
          qSplit: { Q1: 25, Q2: 25, Q3: 25, Q4: 25 },
          budgetMode: 'Constrained',
          marginFloorOn: true,
          marginFloor: 7,
          maxDiscount: 30,
          budgetMult: 120,
          refYear: 2024,
          useTrend: true,
          planYear: 2026,
          baseYear: 2024,
        });
        onSeeded();
      // Run once on mount only.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    };

    const { result } = renderHook(() => useRunSimulation(), { wrapper: ForwardNoScenarioWrapper });
    await waitFor(() => expect(result.current.isRunning).toBe(false));

    await act(async () => {
      await result.current.run();
    });

    expect(mockRunPlan).toHaveBeenCalledWith(expect.objectContaining({
      objective: 'profit',
      alpha: null,
      unconstrained: false,
      margin_floor: 7,
      q_splits: { Q1: 25, Q2: 25, Q3: 25, Q4: 25 },
    }));
    expect(mockRunRetro).not.toHaveBeenCalled();
    expect(mockSaveScenarioConfig).not.toHaveBeenCalled();
  });

  it('returns null early when already running', async () => {
    const RunningStateWrapper = ({ children }: { children: React.ReactNode }) => {
      const [seeded, setSeeded] = React.useState(false);
      return (
        <MemoryRouter initialEntries={['/project/proj-1']}>
          <Routes>
            <Route
              path="/project/:projectId"
              element={
                <SimulatorProvider>
                  <RunningSeeder onSeeded={() => setSeeded(true)} />
                  {seeded && children}
                </SimulatorProvider>
              }
            />
          </Routes>
        </MemoryRouter>
      );
    };

    const RunningSeeder = ({ onSeeded }: { onSeeded: () => void }) => {
      const { updateConfig, setIsRunning } = useSimulator();
      React.useEffect(() => {
        updateConfig({ selectedSkus: ['HX9911/09'] });
        setIsRunning(true);
        onSeeded();
      // Run once on mount only.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    };

    const { result } = renderHook(() => useRunSimulation(), { wrapper: RunningStateWrapper });
    await waitFor(() => expect(result.current.isRunning).toBe(true));

    let returnValue: string | null = 'x';
    await act(async () => {
      returnValue = await result.current.run();
    });

    expect(returnValue).toBeNull();
    expect(mockRunPlan).not.toHaveBeenCalled();
    expect(mockRunRetro).not.toHaveBeenCalled();
    expect(mockSaveScenarioConfig).not.toHaveBeenCalled();
  });
});

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  params: { projectId: 'proj-1', scenarioId: 'scen-1' },
  locationState: null as null | { fromDashboardClick?: boolean },
  navigate: vi.fn(),
  projects: [] as Array<{
    id: string;
    name: string;
    market: string;
    mag: string;
    retailer: string;
    period: string;
    createdOn: string;
    updatedOn: string;
    deleted: boolean;
    description: string;
    scenarios: Array<{
      id: string;
      name: string;
      status: string;
      deleted: boolean;
      hasConfig: boolean;
      hasResult: boolean;
      createdOn: string;
      updatedOn: string;
    }>;
  }>,
  projectsLoading: false,
  loadProjects: vi.fn(),
  loadScenariosForProject: vi.fn(() => Promise.resolve()),
  stage: 'historical' as 'historical' | 'config' | 'optimized',
  updateConfig: vi.fn(),
  setResults: vi.fn(),
  advanceTo: vi.fn(),
  reset: vi.fn(),
  setHistYear: vi.fn(),
  config: { year: 2025, blend: 50 },
  histYear: 2025,
  historicalSummary: null as null | { year: number },
  setHistoricalSummary: vi.fn(),
  setEconomics: vi.fn(),
  economics: 'tn',
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockState.navigate,
  useParams: () => mockState.params,
  useLocation: () => ({ state: mockState.locationState }),
}));

vi.mock('~/contexts/ProjectsContext', () => ({
  useProjects: () => ({
    projects: mockState.projects,
    isLoading: mockState.projectsLoading,
    loadProjects: mockState.loadProjects,
    loadScenariosForProject: mockState.loadScenariosForProject,
  }),
}));

vi.mock('~/contexts/SimulatorContext', () => ({
  useSimulator: () => ({
    stage: mockState.stage,
    updateConfig: mockState.updateConfig,
    setResults: mockState.setResults,
    advanceTo: mockState.advanceTo,
    reset: mockState.reset,
    setHistYear: mockState.setHistYear,
    config: mockState.config,
    histYear: mockState.histYear,
    historicalSummary: mockState.historicalSummary,
    setHistoricalSummary: mockState.setHistoricalSummary,
    setEconomics: mockState.setEconomics,
    economics: mockState.economics,
  }),
}));

vi.mock('~/components/Layout/TopBar', () => ({ TopBar: () => <div data-testid="topbar" /> }));
vi.mock('~/components/Layout/Stepper', () => ({ Stepper: () => <div data-testid="stepper" /> }));
vi.mock('~/components/Layout/RailSidebar', () => ({ RailSidebar: () => <div data-testid="rail" /> }));
vi.mock('~/components/ErrorBoundary', () => ({ ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('~/components/Loader', () => ({ Loader: () => <div data-testid="loader" /> }));
vi.mock('~/screens/SimulatorScreen/stages/HistoricalStage', () => ({ HistoricalStage: () => <div data-testid="historical-stage" /> }));
vi.mock('~/screens/SimulatorScreen/stages/ConfigStage', () => ({ ConfigStage: () => <div data-testid="config-stage" /> }));
vi.mock('~/screens/SimulatorScreen/stages/OptimizedStage', () => ({ OptimizedStage: () => <div data-testid="optimized-stage" /> }));

vi.mock('~/services/projectService', () => ({
  getProject: vi.fn(),
  getScenario: vi.fn(),
  getScenarioConfig: vi.fn(),
  getOptimizationResult: vi.fn(),
}));

vi.mock('~/services/simulationService', () => ({
  fetchHistoricalData: vi.fn(),
}));

import { SimulatorScreen } from '~/screens/SimulatorScreen';
import { getOptimizationResult, getProject, getScenario, getScenarioConfig } from '~/services/projectService';
import { fetchHistoricalData } from '~/services/simulationService';

afterEach(() => {
  cleanup();
  mockState.locationState = null;
  mockState.navigate.mockClear();
  mockState.loadProjects.mockClear();
  mockState.loadScenariosForProject.mockClear();
  mockState.loadScenariosForProject.mockImplementation(() => Promise.resolve());
  mockState.updateConfig.mockClear();
  mockState.setResults.mockClear();
  mockState.advanceTo.mockClear();
  mockState.reset.mockClear();
  mockState.setHistYear.mockClear();
  mockState.setHistoricalSummary.mockClear();
  mockState.setEconomics.mockClear();
  mockState.projects = [];
  mockState.projectsLoading = false;
  mockState.stage = 'historical';
  mockState.histYear = 2025;
  mockState.historicalSummary = null;
});

describe('SimulatorScreen', () => {
  it('shows the loader while projects are loading', () => {
    mockState.projectsLoading = true;
    render(<SimulatorScreen />);
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('shows not-found and navigates back', async () => {
    const user = userEvent.setup();
    render(<SimulatorScreen />);

    await user.click(screen.getByRole('button', { name: /app\.backToProjects/i }));
    expect(mockState.reset).toHaveBeenCalled();
    expect(mockState.navigate).toHaveBeenCalledWith('/projects');
  });

  it('loads project details for direct URL access', async () => {
    mockState.projects = [];
    vi.mocked(getProject).mockResolvedValue({} as never);
    vi.mocked(getScenario).mockResolvedValue({} as never);

    render(<SimulatorScreen />);

    expect(getProject).toHaveBeenCalledWith('proj-1');
    expect(getScenario).toHaveBeenCalledWith('scen-1');
  });

  it('renders the active stage', async () => {
    mockState.projects = [
      {
        id: 'proj-1',
        name: 'Project One',
        market: 'CZ',
        mag: 'RTB',
        retailer: 'All',
        period: 'Full year',
        createdOn: '01 Jan 2026',
        updatedOn: '02 Jan 2026',
        deleted: false,
        description: '',
        scenarios: [
          { id: 'scen-1', name: 'Scenario One', status: 'DRAFT', deleted: false, hasConfig: false, hasResult: false, createdOn: '01 Jan 2026', updatedOn: '02 Jan 2026' },
        ],
      },
    ];
    mockState.stage = 'optimized';

    render(<SimulatorScreen />);

    await waitFor(() => expect(screen.getByTestId('topbar')).toBeInTheDocument());
    expect(screen.getByTestId('stepper')).toBeInTheDocument();
    expect(screen.getByTestId('rail')).toBeInTheDocument();
    expect(screen.getByTestId('optimized-stage')).toBeInTheDocument();
  });

  it('restores saved config for completed scenarios on refresh without auto-advancing', async () => {
    mockState.projects = [
      {
        id: 'proj-1',
        name: 'Project One',
        market: 'CZ',
        mag: 'RTB',
        retailer: 'All',
        period: 'Full year',
        createdOn: '01 Jan 2026',
        updatedOn: '02 Jan 2026',
        deleted: false,
        description: '',
        scenarios: [
          {
            id: 'scen-1',
            name: 'Scenario One',
            status: 'COMPLETED',
            deleted: false,
            hasConfig: true,
            hasResult: true,
            createdOn: '01 Jan 2026',
            updatedOn: '02 Jan 2026',
          },
        ],
      },
    ];
    vi.mocked(getScenarioConfig).mockResolvedValue({
      analysis_type: 'forward',
      selected_skus: ['SKU-1'],
      alpha: 0.5,
      year: 2025,
      plan_year: 2026,
      base_year: 2025,
      period: 'fullYear',
      use_trend: true,
      max_discount: 0.2,
      budget_multiplier: 1,
      unconstrained: false,
      margin_floor: 10,
      reference_year: 2024,
      allocation_mode: 'actual',
      quarterly_splits: { Q1: 25, Q2: 25, Q3: 25, Q4: 25 },
      economics: 'tn',
    } as never);
    vi.mocked(getOptimizationResult).mockResolvedValue({ result_json: { status: 'ok' } } as never);

    render(<SimulatorScreen />);

    await waitFor(() => expect(getScenarioConfig).toHaveBeenCalledWith('scen-1'));
    expect(getOptimizationResult).toHaveBeenCalledWith('scen-1');
    expect(mockState.updateConfig).toHaveBeenCalled();
    expect(mockState.setHistYear).toHaveBeenCalledWith(2024);
    expect(mockState.setResults).toHaveBeenCalledWith({ status: 'ok' });
    expect(mockState.advanceTo).not.toHaveBeenCalledWith('optimized');
  });

  it('auto-advances completed scenario for dashboard-click navigation state', async () => {
    mockState.locationState = { fromDashboardClick: true };
    mockState.projects = [
      {
        id: 'proj-1',
        name: 'Project One',
        market: 'CZ',
        mag: 'RTB',
        retailer: 'All',
        period: 'Full year',
        createdOn: '01 Jan 2026',
        updatedOn: '02 Jan 2026',
        deleted: false,
        description: '',
        scenarios: [
          {
            id: 'scen-1',
            name: 'Scenario One',
            status: 'COMPLETED',
            deleted: false,
            hasConfig: true,
            hasResult: true,
            createdOn: '01 Jan 2026',
            updatedOn: '02 Jan 2026',
          },
        ],
      },
    ];
    vi.mocked(getScenarioConfig).mockResolvedValue(null as never);
    vi.mocked(getOptimizationResult).mockResolvedValue({ result_json: { status: 'ok' } } as never);

    render(<SimulatorScreen />);

    await waitFor(() => expect(mockState.advanceTo).toHaveBeenCalledWith('optimized'));
  });

  it('loads scenarios for project in config stage without historical refetch for draft scenarios', async () => {
    mockState.stage = 'config';
    mockState.config = { year: 2025, blend: 50 };
    mockState.histYear = 2024;
    mockState.projects = [
      {
        id: 'proj-1',
        name: 'Project One',
        market: 'CZ',
        mag: 'RTB',
        retailer: 'All',
        period: 'Full year',
        createdOn: '01 Jan 2026',
        updatedOn: '02 Jan 2026',
        deleted: false,
        description: '',
        scenarios: [
          { id: 'scen-1', name: 'Scenario One', status: 'DRAFT', deleted: false, hasConfig: false, hasResult: false, createdOn: '01 Jan 2026', updatedOn: '02 Jan 2026' },
        ],
      },
    ];

    render(<SimulatorScreen />);

    await waitFor(() => expect(mockState.loadScenariosForProject).toHaveBeenCalledWith('proj-1'));
    expect(fetchHistoricalData).not.toHaveBeenCalled();
  });

  it('fetches historical summary in config stage for completed scenarios when missing', async () => {
    mockState.stage = 'config';
    mockState.histYear = 2024;
    mockState.historicalSummary = null;
    mockState.projects = [
      {
        id: 'proj-1',
        name: 'Project One',
        market: 'CZ',
        mag: 'RTB',
        retailer: 'All',
        period: 'Full year',
        createdOn: '01 Jan 2026',
        updatedOn: '02 Jan 2026',
        deleted: false,
        description: '',
        scenarios: [
          { id: 'scen-1', name: 'Scenario One', status: 'COMPLETED', deleted: false, hasConfig: true, hasResult: true, createdOn: '01 Jan 2026', updatedOn: '02 Jan 2026' },
        ],
      },
    ];
    vi.mocked(fetchHistoricalData).mockResolvedValue({ year: 2024 } as never);

    render(<SimulatorScreen />);

    await waitFor(() => expect(fetchHistoricalData).toHaveBeenCalledWith(2024, undefined, undefined, 'tn'));
    expect(mockState.setHistoricalSummary).toHaveBeenCalledWith({ year: 2024 });
  });

  it('loads completed-scenario historical summary using selected year in config stage', async () => {
    mockState.stage = 'config';
    mockState.histYear = 2024;
    mockState.historicalSummary = { year: 2024 };
    mockState.projects = [
      {
        id: 'proj-1',
        name: 'Project One',
        market: 'CZ',
        mag: 'RTB',
        retailer: 'All',
        period: 'Full year',
        createdOn: '01 Jan 2026',
        updatedOn: '02 Jan 2026',
        deleted: false,
        description: '',
        scenarios: [
          { id: 'scen-1', name: 'Scenario One', status: 'COMPLETED', deleted: false, hasConfig: true, hasResult: true, createdOn: '01 Jan 2026', updatedOn: '02 Jan 2026' },
        ],
      },
    ];

    render(<SimulatorScreen />);

    await waitFor(() => expect(screen.getByTestId('config-stage')).toBeInTheDocument());
    expect(fetchHistoricalData).toHaveBeenCalledWith(2024, undefined, undefined, 'tn');
  });

  it('exits loader state when completed scenario hydration fails', async () => {
    mockState.stage = 'config';
    mockState.projects = [
      {
        id: 'proj-1',
        name: 'Project One',
        market: 'CZ',
        mag: 'RTB',
        retailer: 'All',
        period: 'Full year',
        createdOn: '01 Jan 2026',
        updatedOn: '02 Jan 2026',
        deleted: false,
        description: '',
        scenarios: [
          { id: 'scen-1', name: 'Scenario One', status: 'COMPLETED', deleted: false, hasConfig: true, hasResult: true, createdOn: '01 Jan 2026', updatedOn: '02 Jan 2026' },
        ],
      },
    ];
    vi.mocked(getScenarioConfig).mockRejectedValueOnce(new Error('config failed'));
    vi.mocked(getOptimizationResult).mockRejectedValueOnce(new Error('result failed'));

    render(<SimulatorScreen />);

    await waitFor(() => expect(screen.getByTestId('config-stage')).toBeInTheDocument());
  });

  it('resets when browser pageshow event is persisted', () => {
    mockState.projects = [
      {
        id: 'proj-1',
        name: 'Project One',
        market: 'CZ',
        mag: 'RTB',
        retailer: 'All',
        period: 'Full year',
        createdOn: '01 Jan 2026',
        updatedOn: '02 Jan 2026',
        deleted: false,
        description: '',
        scenarios: [
          { id: 'scen-1', name: 'Scenario One', status: 'DRAFT', deleted: false, hasConfig: false, hasResult: false, createdOn: '01 Jan 2026', updatedOn: '02 Jan 2026' },
        ],
      },
    ];

    render(<SimulatorScreen />);

    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    expect(mockState.reset).toHaveBeenCalled();
  });

  it('keeps not-found state when direct URL ownership checks fail', async () => {
    mockState.projects = [];
    vi.mocked(getProject).mockRejectedValueOnce(new Error('no project'));
    vi.mocked(getScenario).mockRejectedValueOnce(new Error('no scenario'));

    render(<SimulatorScreen />);

    await waitFor(() => expect(getProject).toHaveBeenCalledWith('proj-1'));
    expect(mockState.loadProjects).not.toHaveBeenCalled();
    expect(screen.getByText('errors.missingProjectScenario')).toBeInTheDocument();
  });

  it('applies completed-scenario fallback config fields when optional values are absent', async () => {
    mockState.projects = [
      {
        id: 'proj-1',
        name: 'Project One',
        market: 'CZ',
        mag: 'RTB',
        retailer: 'All',
        period: 'Full year',
        createdOn: '01 Jan 2026',
        updatedOn: '02 Jan 2026',
        deleted: false,
        description: '',
        scenarios: [
          {
            id: 'scen-1',
            name: 'Scenario One',
            status: 'COMPLETED',
            deleted: false,
            hasConfig: true,
            hasResult: false,
            createdOn: '01 Jan 2026',
            updatedOn: '02 Jan 2026',
          },
        ],
      },
    ];
    vi.mocked(getScenarioConfig).mockResolvedValue({
      analysis_type: 'retro',
      selected_skus: ['SKU-1'],
      alpha: null,
      objective: 'turnover',
      year: null,
      plan_year: null,
      base_year: null,
      period: 'fullYear',
      use_trend: false,
      max_discount: 0.1,
      budget_multiplier: 1,
      unconstrained: true,
      margin_floor: 0,
      reference_year: 2024,
      allocation_mode: 'custom',
      quarterly_splits: null,
    } as never);
    vi.mocked(getOptimizationResult).mockResolvedValue({ result_json: null } as never);

    render(<SimulatorScreen />);

    await waitFor(() => expect(getScenarioConfig).toHaveBeenCalledWith('scen-1'));
    expect(mockState.updateConfig).toHaveBeenCalledWith(expect.objectContaining({
      blend: 0,
      budgetMode: 'Unconstrained',
      marginFloorOn: false,
      qSplit: { Q1: 25, Q2: 25, Q3: 25, Q4: 25 },
    }));
    expect(mockState.setEconomics).not.toHaveBeenCalled();
  });

  it('maps objective-only profit config to full blend', async () => {
    mockState.projects = [
      {
        id: 'proj-1',
        name: 'Project One',
        market: 'CZ',
        mag: 'RTB',
        retailer: 'All',
        period: 'Full year',
        createdOn: '01 Jan 2026',
        updatedOn: '02 Jan 2026',
        deleted: false,
        description: '',
        scenarios: [
          {
            id: 'scen-1',
            name: 'Scenario One',
            status: 'COMPLETED',
            deleted: false,
            hasConfig: true,
            hasResult: false,
            createdOn: '01 Jan 2026',
            updatedOn: '02 Jan 2026',
          },
        ],
      },
    ];
    vi.mocked(getScenarioConfig).mockResolvedValue({
      analysis_type: 'forward',
      selected_skus: ['SKU-1'],
      alpha: null,
      objective: 'profit',
      year: 2025,
      plan_year: 2026,
      base_year: 2025,
      period: 'fullYear',
      use_trend: false,
      max_discount: 0.1,
      budget_multiplier: 1,
      unconstrained: true,
      margin_floor: 0,
      reference_year: 2024,
      allocation_mode: 'actual',
      quarterly_splits: { Q1: 25, Q2: 25, Q3: 25, Q4: 25 },
    } as never);
    vi.mocked(getOptimizationResult).mockResolvedValue({ result_json: null } as never);

    render(<SimulatorScreen />);

    await waitFor(() => expect(getScenarioConfig).toHaveBeenCalledWith('scen-1'));
    expect(mockState.updateConfig).toHaveBeenCalledWith(expect.objectContaining({ blend: 100 }));
  });

  it('maps unknown objective without alpha to neutral blend', async () => {
    mockState.projects = [
      {
        id: 'proj-1',
        name: 'Project One',
        market: 'CZ',
        mag: 'RTB',
        retailer: 'All',
        period: 'Full year',
        createdOn: '01 Jan 2026',
        updatedOn: '02 Jan 2026',
        deleted: false,
        description: '',
        scenarios: [
          {
            id: 'scen-1',
            name: 'Scenario One',
            status: 'COMPLETED',
            deleted: false,
            hasConfig: true,
            hasResult: false,
            createdOn: '01 Jan 2026',
            updatedOn: '02 Jan 2026',
          },
        ],
      },
    ];
    vi.mocked(getScenarioConfig).mockResolvedValue({
      analysis_type: 'forward',
      selected_skus: ['SKU-1'],
      alpha: null,
      objective: 'other',
      year: 2025,
      plan_year: 2026,
      base_year: 2025,
      period: 'fullYear',
      use_trend: false,
      max_discount: 0.1,
      budget_multiplier: 1,
      unconstrained: true,
      margin_floor: 0,
      reference_year: 2024,
      allocation_mode: 'actual',
      quarterly_splits: { Q1: 25, Q2: 25, Q3: 25, Q4: 25 },
    } as never);
    vi.mocked(getOptimizationResult).mockResolvedValue({ result_json: null } as never);

    render(<SimulatorScreen />);

    await waitFor(() => expect(getScenarioConfig).toHaveBeenCalledWith('scen-1'));
    expect(mockState.updateConfig).toHaveBeenCalledWith(expect.objectContaining({ blend: 50 }));
  });

  it('keeps config stage visible when completed historical-summary fetch fails', async () => {
    mockState.stage = 'config';
    mockState.histYear = 2024;
    mockState.historicalSummary = null;
    mockState.projects = [
      {
        id: 'proj-1',
        name: 'Project One',
        market: 'CZ',
        mag: 'RTB',
        retailer: 'All',
        period: 'Full year',
        createdOn: '01 Jan 2026',
        updatedOn: '02 Jan 2026',
        deleted: false,
        description: '',
        scenarios: [
          { id: 'scen-1', name: 'Scenario One', status: 'COMPLETED', deleted: false, hasConfig: true, hasResult: true, createdOn: '01 Jan 2026', updatedOn: '02 Jan 2026' },
        ],
      },
    ];
    vi.mocked(fetchHistoricalData).mockRejectedValueOnce(new Error('history failed'));

    render(<SimulatorScreen />);

    await waitFor(() => expect(fetchHistoricalData).toHaveBeenCalledWith(2024, undefined, undefined, 'tn'));
    expect(screen.getByTestId('config-stage')).toBeInTheDocument();
    expect(mockState.setHistoricalSummary).not.toHaveBeenCalled();
  });
});
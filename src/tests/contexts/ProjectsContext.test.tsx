import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@azure/msal-react', () => ({
  useMsal: () => mockState.msal,
}));

vi.mock('@azure/msal-browser', () => ({
  InteractionStatus: { None: 'None' },
}));

vi.mock('~/services/projectService', () => ({
  fetchDashboard: vi.fn(),
  fetchProjects: vi.fn(),
  fetchDeletedProjects: vi.fn(),
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  permanentlyDeleteProject: vi.fn(),
  restoreProject: vi.fn(),
  updateProject: vi.fn(),
  fetchScenarios: vi.fn(),
  fetchDeletedScenarios: vi.fn(),
  fetchDeletedScenariosDashboard: vi.fn(),
  createScenario: vi.fn(),
  deleteScenario: vi.fn(),
  permanentlyDeleteScenario: vi.fn(),
  deleteScenarioConfig: vi.fn(),
  deleteOptimizationResult: vi.fn(),
  restoreScenario: vi.fn(),
  updateScenario: vi.fn(),
}));

vi.mock('~/utils/apiClient', () => ({
  isAPIError: (error: unknown) => Boolean(error && typeof error === 'object' && 'response' in error),
}));

import { ProjectsProvider, useProjects } from '~/contexts/ProjectsContext';
import {
  createProject as apiCreateProject,
  createScenario as apiCreateScenario,
  deleteProject as apiDeleteProject,
  deleteScenario as apiDeleteScenario,
  deleteScenarioConfig as apiDeleteScenarioConfig,
  deleteOptimizationResult as apiDeleteOptimizationResult,
  fetchDashboard,
  fetchDeletedProjects,
  fetchDeletedScenarios,
  fetchDeletedScenariosDashboard,
  fetchProjects,
  fetchScenarios,
  permanentlyDeleteProject as apiPermanentlyDeleteProject,
  permanentlyDeleteScenario as apiPermanentlyDeleteScenario,
  restoreProject as apiRestoreProject,
  restoreScenario as apiRestoreScenario,
  updateProject as apiUpdateProject,
  updateScenario as apiUpdateScenario,
} from '~/services/projectService';
import type { ApiProject, ApiScenario, ApiScenarioStatus } from '~/types/project';

const mockState = vi.hoisted(() => ({
  msal: {
    inProgress: 'None',
    instance: { getActiveAccount: vi.fn(() => ({ username: 'jane@example.com' })) },
    accounts: [{ username: 'jane@example.com' }],
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ProjectsProvider>{children}</ProjectsProvider>
);

const apiProject: ApiProject = {
  project_id: 'proj-1',
  project_name: 'Project One',
  user_id: 'user-1',
  is_deleted: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  markets: ['CZ'],
  mags: ['RTB'],
  retailers: ['All'],
  description: 'desc',
};

const apiScenario: ApiScenario = {
  scenario_id: 'scen-1',
  project_id: 'proj-1',
  scenario_name: 'Scenario One',
  status: 'DRAFT',
  is_deleted: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

const pendingTimeouts: Array<ReturnType<typeof globalThis.setTimeout>> = [];
const nativeSetTimeout = globalThis.setTimeout.bind(globalThis);

describe('ProjectsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(
      ((...args: Parameters<typeof globalThis.setTimeout>): ReturnType<typeof globalThis.setTimeout> => {
        const timerId = nativeSetTimeout(...args);
        pendingTimeouts.push(timerId);
        return timerId;
      }) as typeof setTimeout
    );
    mockState.msal.inProgress = 'None';
    vi.mocked(fetchDeletedProjects).mockResolvedValue({ total: 0, projects: [] } as never);
    vi.mocked(fetchDeletedScenarios).mockResolvedValue({ total: 0, scenarios: [] } as never);
    vi.mocked(fetchDeletedScenariosDashboard).mockResolvedValue({ total: 0, scenarios: [] } as never);
  });

  afterEach(() => {
    while (pendingTimeouts.length > 0) {
      const timerId = pendingTimeouts.pop();
      if (timerId) {
        globalThis.clearTimeout(timerId);
      }
    }
    vi.restoreAllMocks();
    cleanup();
  });

  it('throws outside the provider', () => {
    expect(() => renderHook(() => useProjects())).toThrow('useProjects must be used inside ProjectsProvider');
  });

  it('loads dashboard projects on mount', async () => {
    vi.mocked(fetchDashboard).mockResolvedValue({ user_id: 'user-1', total_projects: 1, projects: [{ ...apiProject, scenarios: [] }] } as never);
    vi.mocked(fetchProjects).mockResolvedValue({ total: 1, projects: [apiProject] } as never);
    vi.mocked(fetchScenarios).mockResolvedValue({ total: 1, scenarios: [apiScenario] } as never);

    const { result } = renderHook(() => useProjects(), { wrapper });

    await waitFor(() => expect(result.current.projects).toHaveLength(1));
    expect(fetchDashboard).toHaveBeenCalledWith('jane@example.com');
    expect(fetchDeletedProjects).toHaveBeenCalledTimes(1);
    expect(fetchDeletedScenariosDashboard).toHaveBeenCalledTimes(1);
    expect(fetchDeletedScenarios).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.projects[0].name).toBe('Project One');
  });

  it('uses deleted scenarios from dashboard payload without extra fetch', async () => {
    vi.mocked(fetchDashboard).mockResolvedValue({
      user_id: 'user-1',
      total_projects: 1,
      projects: [{
        ...apiProject,
        scenarios: [
          apiScenario,
          {
            ...apiScenario,
            scenario_id: 'scen-del-1',
            scenario_name: 'Scenario Deleted',
            is_deleted: true,
          },
        ],
      }],
    } as never);

    const { result } = renderHook(() => useProjects(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const loadedProject = result.current.projects.find((project) => project.id === 'proj-1');
    expect(loadedProject?.scenarios.map((scenario) => scenario.id)).toContain('scen-del-1');
    expect(loadedProject?.scenarios.find((scenario) => scenario.id === 'scen-del-1')?.deleted).toBe(true);
    expect(fetchDeletedScenariosDashboard).toHaveBeenCalledTimes(1);
    expect(fetchDeletedScenarios).not.toHaveBeenCalled();
  });

  it('falls back to legacy endpoints when dashboard loading fails', async () => {
    vi.mocked(fetchDashboard).mockRejectedValue(new Error('down'));
    vi.mocked(fetchProjects).mockResolvedValue({ total: 1, projects: [apiProject] } as never);
    vi.mocked(fetchDeletedProjects).mockResolvedValue({ total: 0, projects: [] } as never);
    vi.mocked(fetchScenarios).mockResolvedValue({ total: 1, scenarios: [apiScenario] } as never);
    vi.mocked(fetchDeletedScenarios).mockResolvedValue({ total: 0, scenarios: [] } as never);

    const { result } = renderHook(() => useProjects(), { wrapper });

    await waitFor(() => expect(result.current.projects).toHaveLength(1));
    expect(fetchProjects).toHaveBeenCalled();
    expect(fetchDeletedProjects).toHaveBeenCalled();
    expect(fetchDeletedScenariosDashboard).toHaveBeenCalledTimes(1);
    expect(fetchScenarios).toHaveBeenCalledWith('proj-1');
    expect(fetchDeletedScenarios).not.toHaveBeenCalled();
  });

  it('creates, updates, and deletes projects and scenarios', async () => {
    vi.mocked(fetchDashboard).mockResolvedValue({ user_id: 'user-1', total_projects: 1, projects: [{ ...apiProject, scenarios: [] }] } as never);
    vi.mocked(apiCreateProject).mockResolvedValue(apiProject as never);
    vi.mocked(apiUpdateProject).mockResolvedValue({ ...apiProject, project_name: 'Renamed', description: 'updated' } as never);
    vi.mocked(apiCreateScenario).mockResolvedValue(apiScenario as never);
    vi.mocked(apiUpdateScenario).mockResolvedValue(apiScenario as never);
    vi.mocked(apiDeleteScenario).mockResolvedValue(undefined as never);
    vi.mocked(apiRestoreScenario).mockResolvedValue(undefined as never);
    vi.mocked(apiDeleteScenarioConfig).mockResolvedValue(undefined as never);
    vi.mocked(apiDeleteOptimizationResult).mockResolvedValue(undefined as never);
    vi.mocked(apiPermanentlyDeleteScenario).mockResolvedValue(undefined as never);
    vi.mocked(apiRestoreProject).mockResolvedValue(undefined as never);
    vi.mocked(apiPermanentlyDeleteProject).mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useProjects(), { wrapper });
    await waitFor(() => expect(result.current.projects).toHaveLength(1));

    await act(async () => {
      await result.current.createProject({ name: 'New Project', market: 'CZ', mag: 'RTB', retailer: 'All', description: '' });
    });
    expect(apiCreateProject).toHaveBeenCalled();

    await act(async () => {
      await result.current.updateProject('proj-1', 'Renamed', 'updated');
    });
    expect(apiUpdateProject).toHaveBeenCalledWith('proj-1', { project_name: 'Renamed', description: 'updated' });

    await act(async () => {
      await result.current.addScenario('proj-1', 'Scenario Two');
      await result.current.renameScenario('proj-1', 'scen-1', 'Scenario Renamed');
      await result.current.deleteScenario('proj-1', 'scen-1');
      await result.current.restoreScenario('proj-1', 'scen-1');
      await result.current.permanentlyDeleteScenario('proj-1', 'scen-1');
      await result.current.restoreProject('proj-1');
      await result.current.permanentlyDeleteProject('proj-1');
    });

    expect(apiCreateScenario).toHaveBeenCalledWith('proj-1', 'Scenario Two');
    expect(apiUpdateScenario).toHaveBeenCalledWith('scen-1', { scenario_name: 'Scenario Renamed' });
    expect(apiDeleteScenario).toHaveBeenCalledWith('scen-1');
    expect(apiRestoreScenario).toHaveBeenCalledWith('scen-1');
    expect(apiPermanentlyDeleteScenario).toHaveBeenCalledWith('scen-1');
    expect(apiRestoreProject).toHaveBeenCalledWith('proj-1');
    expect(apiPermanentlyDeleteProject).toHaveBeenCalledWith('proj-1');
  });

  it('does not create duplicate scenario names when matching soft-deleted entry exists', async () => {
    vi.mocked(fetchDashboard).mockResolvedValue({
      user_id: 'user-1',
      total_projects: 1,
      projects: [{
        ...apiProject,
        scenarios: [{
          ...apiScenario,
          scenario_id: 'scen-del-2',
          scenario_name: 'Scenario Two',
          is_deleted: true,
        }],
      }],
    } as never);

    const { result } = renderHook(() => useProjects(), { wrapper });
    await waitFor(() => expect(result.current.projects).toHaveLength(1));

    await act(async () => {
      await result.current.addScenario('proj-1', '  scenario two  ');
    });

    expect(apiCreateScenario).not.toHaveBeenCalled();
  });

  it('toggles expansion and fetches scenarios once for dashboard-loaded projects', async () => {
    vi.mocked(fetchDashboard).mockResolvedValue({
      user_id: 'user-1',
      total_projects: 1,
      projects: [{ ...apiProject, scenarios: [apiScenario] }],
    } as never);
    vi.mocked(fetchScenarios).mockResolvedValue({ total: 1, scenarios: [apiScenario] } as never);
    vi.mocked(fetchDeletedScenarios).mockResolvedValue({ total: 0, scenarios: [] } as never);

    const { result } = renderHook(() => useProjects(), { wrapper });
    await waitFor(() => expect(result.current.projects).toHaveLength(1));

    act(() => {
      result.current.toggleExpanded('proj-1');
    });

    expect(fetchScenarios).toHaveBeenCalledWith('proj-1');
    expect(fetchDeletedScenarios).not.toHaveBeenCalled();
    expect(result.current.expandedIds.has('proj-1')).toBe(true);

    act(() => {
      result.current.updateScenarioStatusLocally('proj-1', 'scen-1', 'COMPLETED' as ApiScenarioStatus);
    });
    expect(result.current.projects[0].scenarios[0]?.status).toBe('COMPLETED');
  });

  it('loads deleted scenarios from dashboard endpoint for deleted-item workflows', async () => {
    vi.mocked(fetchDashboard).mockResolvedValue({
      user_id: 'user-1',
      total_projects: 1,
      projects: [{ ...apiProject, scenarios: [apiScenario] }],
    } as never);
    vi.mocked(fetchDeletedScenariosDashboard).mockResolvedValue({
      total: 1,
      scenarios: [{ ...apiScenario, scenario_id: 'scen-del-1', scenario_name: 'Scenario Deleted', is_deleted: true }],
    } as never);

    const { result } = renderHook(() => useProjects(), { wrapper });
    await waitFor(() => expect(result.current.projects).toHaveLength(1));

    await act(async () => {
      await result.current.loadDeletedScenariosForProject('proj-1');
    });

    expect(fetchDeletedScenariosDashboard).toHaveBeenCalled();
    expect(fetchDeletedScenarios).not.toHaveBeenCalled();
    expect(result.current.projects[0].scenarios.map((scenario) => scenario.id)).toContain('scen-del-1');
  });

  it('keeps deleted scenarios when active scenarios are refreshed on expand', async () => {
    vi.mocked(fetchDashboard).mockResolvedValue({
      user_id: 'user-1',
      total_projects: 1,
      projects: [{
        ...apiProject,
        scenarios: [
          apiScenario,
          {
            ...apiScenario,
            scenario_id: 'scen-del-keep',
            scenario_name: 'Scenario Deleted',
            is_deleted: true,
          },
        ],
      }],
    } as never);
    vi.mocked(fetchScenarios).mockResolvedValue({ total: 1, scenarios: [apiScenario] } as never);

    const { result } = renderHook(() => useProjects(), { wrapper });
    await waitFor(() => expect(result.current.projects).toHaveLength(1));

    act(() => {
      result.current.toggleExpanded('proj-1');
    });

    await waitFor(() => expect(fetchScenarios).toHaveBeenCalledWith('proj-1'));

    const scenarioIds = result.current.projects[0].scenarios.map((scenario) => scenario.id);
    expect(scenarioIds).toContain('scen-1');
    expect(scenarioIds).toContain('scen-del-keep');
  });

  it('waits for MSAL interaction completion before auto-loading', async () => {
    mockState.msal.inProgress = 'Login';
    vi.mocked(fetchDashboard).mockResolvedValue({
      user_id: 'user-1',
      total_projects: 1,
      projects: [{ ...apiProject, scenarios: [] }],
    } as never);

    const { rerender } = renderHook(() => useProjects(), { wrapper });
    expect(fetchDashboard).not.toHaveBeenCalled();

    mockState.msal.inProgress = 'None';
    rerender();

    await waitFor(() => {
      expect(fetchDashboard).toHaveBeenCalled();
    });
  });

  it('maps array detail API errors during legacy load fallback', async () => {
    vi.mocked(fetchDashboard).mockRejectedValue(new Error('dashboard-down'));
    vi.mocked(fetchProjects).mockRejectedValue({
      response: {
        status: 422,
        data: {
          detail: [{ loc: ['body', 'project_name'], msg: 'required' }],
        },
      },
    } as never);

    const { result } = renderHook(() => useProjects(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('body.project_name: required');
  });

  it('retries delete after scenario cleanup on transient server error', async () => {
    vi.mocked(fetchDashboard).mockResolvedValue({
      user_id: 'user-1',
      total_projects: 1,
      projects: [{ ...apiProject, scenarios: [] }],
    } as never);
    vi.mocked(apiDeleteProject)
      .mockRejectedValueOnce({ response: { status: 500 } } as never)
      .mockResolvedValueOnce(undefined as never);
    vi.mocked(fetchScenarios).mockResolvedValue({
      total: 1,
      scenarios: [{ ...apiScenario, scenario_id: 'scen-a' }],
    } as never);
    vi.mocked(fetchDeletedScenarios).mockResolvedValue({
      total: 1,
      scenarios: [{ ...apiScenario, scenario_id: 'scen-b', is_deleted: true }],
    } as never);

    const { result } = renderHook(() => useProjects(), { wrapper });
    await waitFor(() => expect(result.current.projects).toHaveLength(1));

    await act(async () => {
      await result.current.deleteProject('proj-1');
    });

    expect(apiDeleteScenarioConfig).toHaveBeenCalledWith('scen-a');
    expect(apiDeleteScenarioConfig).toHaveBeenCalledWith('scen-b');
    expect(apiDeleteOptimizationResult).toHaveBeenCalledWith('scen-a');
    expect(apiDeleteOptimizationResult).toHaveBeenCalledWith('scen-b');
    expect(apiDeleteScenario).toHaveBeenCalledWith('scen-a');
    expect(apiDeleteProject).toHaveBeenCalledTimes(2);
  });

  it('shows conflict toast when project delete fails with non-500 API error', async () => {
    vi.mocked(fetchDashboard).mockResolvedValue({
      user_id: 'user-1',
      total_projects: 1,
      projects: [{ ...apiProject, scenarios: [] }],
    } as never);
    vi.mocked(apiDeleteProject).mockRejectedValue({ response: { status: 409 } } as never);

    const { result } = renderHook(() => useProjects(), { wrapper });
    await waitFor(() => expect(result.current.projects).toHaveLength(1));

    await act(async () => {
      await result.current.deleteProject('proj-1');
    });

    await waitFor(() => expect(result.current.toast?.type).toBe('error'));
    expect(result.current.toast?.message).toBe('home.projectRow.popups.projectDeleteConflict');
  });

  it('falls back to permanent project delete when delete retries keep failing', async () => {
    vi.mocked(fetchDashboard).mockResolvedValue({
      user_id: 'user-1',
      total_projects: 1,
      projects: [{ ...apiProject, scenarios: [] }],
    } as never);
    vi.mocked(apiDeleteProject)
      .mockRejectedValueOnce({ response: { status: 500 } } as never)
      .mockRejectedValueOnce({ response: { status: 500 } } as never)
      .mockRejectedValueOnce({ response: { status: 500 } } as never);
    vi.mocked(fetchScenarios).mockResolvedValue({ total: 0, scenarios: [] } as never);
    vi.mocked(fetchDeletedScenarios).mockResolvedValue({
      total: 1,
      scenarios: [{ ...apiScenario, scenario_id: 'scen-del-x', is_deleted: true }],
    } as never);
    vi.mocked(apiPermanentlyDeleteScenario).mockRejectedValue(new Error('perm scenario delete failed') as never);
    vi.mocked(apiPermanentlyDeleteProject).mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useProjects(), { wrapper });
    await waitFor(() => expect(result.current.projects).toHaveLength(1));

    await act(async () => {
      await result.current.deleteProject('proj-1');
    });

    expect(apiPermanentlyDeleteScenario).toHaveBeenCalledWith('scen-del-x');
    expect(apiPermanentlyDeleteProject).toHaveBeenCalledWith('proj-1');
    expect(result.current.projects).toHaveLength(0);
  });

  it('shows generic delete failure when all fallback paths fail', async () => {
    vi.mocked(fetchDashboard).mockResolvedValue({
      user_id: 'user-1',
      total_projects: 1,
      projects: [{ ...apiProject, scenarios: [] }],
    } as never);
    vi.mocked(fetchProjects).mockResolvedValue({ total: 1, projects: [apiProject] } as never);
    vi.mocked(fetchScenarios).mockResolvedValue({ total: 0, scenarios: [] } as never);
    vi.mocked(apiDeleteProject)
      .mockRejectedValueOnce({ response: { status: 500 } } as never)
      .mockRejectedValueOnce({ response: { status: 500 } } as never)
      .mockRejectedValueOnce({ response: { status: 500 } } as never);
    vi.mocked(fetchDeletedScenarios).mockResolvedValue({
      total: 1,
      scenarios: [{ ...apiScenario, scenario_id: 'scen-del-y', is_deleted: true }],
    } as never);
    vi.mocked(apiPermanentlyDeleteScenario).mockRejectedValue(new Error('perm scenario delete failed') as never);
    vi.mocked(apiPermanentlyDeleteProject).mockRejectedValue(new Error('perm project delete failed') as never);

    const { result } = renderHook(() => useProjects(), { wrapper });
    await waitFor(() => expect(result.current.projects).toHaveLength(1));

    await act(async () => {
      await result.current.deleteProject('proj-1');
    });

    await waitFor(() => expect(result.current.toast?.type).toBe('error'));
    expect(result.current.toast?.message).toBe('home.projectRow.popups.projectDeleteFailed');
  });

  it('handles rename, delete, and restore scenario errors', async () => {
    vi.mocked(fetchDashboard).mockResolvedValue({
      user_id: 'user-1',
      total_projects: 1,
      projects: [{ ...apiProject, scenarios: [apiScenario] }],
    } as never);
    vi.mocked(apiUpdateScenario).mockRejectedValue(new Error('rename failed') as never);
    vi.mocked(apiDeleteScenario).mockRejectedValue({ response: { status: 409 } } as never);
    vi.mocked(apiRestoreScenario).mockRejectedValue({ response: { status: 409 } } as never);

    const { result } = renderHook(() => useProjects(), { wrapper });
    await waitFor(() => expect(result.current.projects).toHaveLength(1));

    await act(async () => {
      await result.current.renameScenario('proj-1', 'scen-1', 'Renamed Scenario');
    });
    await waitFor(() => expect(result.current.toast?.type).toBe('error'));
    expect(result.current.toast?.message).toBe('home.projectRow.popups.scenarioRenameFailed');

    await act(async () => {
      await result.current.deleteScenario('proj-1', 'scen-1');
    });
    await waitFor(() => expect(result.current.toast?.type).toBe('error'));
    expect(result.current.toast?.message).toBe('home.projectRow.popups.scenarioDeleteConflict');

    await act(async () => {
      await result.current.restoreScenario('proj-1', 'scen-1');
    });
    await waitFor(() => expect(result.current.toast?.type).toBe('error'));
    expect(result.current.toast?.message).toBe('home.projectRow.popups.scenarioRestoreConflict');
  });

  it('handles permanent scenario delete non-500 and retry failure branches', async () => {
    vi.mocked(fetchDashboard).mockResolvedValue({
      user_id: 'user-1',
      total_projects: 1,
      projects: [{ ...apiProject, scenarios: [apiScenario] }],
    } as never);
    vi.mocked(apiPermanentlyDeleteScenario)
      .mockRejectedValueOnce({ response: { status: 409 } } as never)
      .mockRejectedValueOnce({ response: { status: 500 } } as never)
      .mockRejectedValueOnce({ response: { status: 409 } } as never);
    vi.mocked(apiDeleteScenarioConfig).mockResolvedValue(undefined as never);
    vi.mocked(apiDeleteOptimizationResult).mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useProjects(), { wrapper });
    await waitFor(() => expect(result.current.projects).toHaveLength(1));

    await act(async () => {
      await result.current.permanentlyDeleteScenario('proj-1', 'scen-1');
    });
    await waitFor(() => expect(result.current.toast?.type).toBe('error'));
    expect(result.current.toast?.message).toBe('home.projectRow.popups.scenarioPermanentDeleteConflict');
    expect(result.current.projects[0]?.scenarios).toHaveLength(1);

    await act(async () => {
      await result.current.permanentlyDeleteScenario('proj-1', 'scen-1');
    });
    await waitFor(() => expect(result.current.toast?.type).toBe('error'));
    expect(apiDeleteScenarioConfig).toHaveBeenCalledWith('scen-1');
    expect(apiDeleteOptimizationResult).toHaveBeenCalledWith('scen-1');
    expect(result.current.toast?.message).toBe('home.projectRow.popups.scenarioPermanentDeleteConflict');
    expect(result.current.projects[0]?.scenarios).toHaveLength(1);
  });

  it('handles update project failure by throwing and setting error toast', async () => {
    vi.mocked(fetchDashboard).mockResolvedValue({
      user_id: 'user-1',
      total_projects: 1,
      projects: [{ ...apiProject, scenarios: [] }],
    } as never);
    vi.mocked(apiUpdateProject).mockRejectedValue(new Error('update failed') as never);

    const { result } = renderHook(() => useProjects(), { wrapper });
    await waitFor(() => expect(result.current.projects).toHaveLength(1));

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.updateProject('proj-1', 'Renamed', 'updated');
      } catch (error) {
        thrown = error;
      }
    });

    expect((thrown as Error).message).toBe('update failed');

    await waitFor(() => expect(result.current.toast?.type).toBe('error'));
    expect(result.current.toast?.message).toBe('errors.updateProjectFailed');
  });

  it('handles addScenario for missing project and API conflict error', async () => {
    vi.mocked(fetchDashboard).mockResolvedValue({
      user_id: 'user-1',
      total_projects: 1,
      projects: [{ ...apiProject, scenarios: [] }],
    } as never);
    vi.mocked(apiCreateScenario).mockRejectedValue({ response: { status: 409 } } as never);

    const { result } = renderHook(() => useProjects(), { wrapper });
    await waitFor(() => expect(result.current.projects).toHaveLength(1));

    await act(async () => {
      await result.current.addScenario('unknown-project', 'Scenario Ghost');
    });

    await act(async () => {
      await result.current.addScenario('proj-1', 'Scenario Conflict');
    });

    await waitFor(() => expect(result.current.toast?.type).toBe('error'));
    expect(result.current.toast?.message).toBe('home.projectRow.popups.scenarioExists');
  });

  it('handles restore and permanent-delete project failures', async () => {
    vi.mocked(fetchDashboard).mockResolvedValue({
      user_id: 'user-1',
      total_projects: 1,
      projects: [{ ...apiProject, scenarios: [] }],
    } as never);
    vi.mocked(apiRestoreProject).mockRejectedValue({ response: { status: 409 } } as never);
    vi.mocked(apiPermanentlyDeleteProject).mockRejectedValue({ response: { status: 409 } } as never);

    const { result } = renderHook(() => useProjects(), { wrapper });
    await waitFor(() => expect(result.current.projects).toHaveLength(1));

    await act(async () => {
      await result.current.restoreProject('proj-1');
    });
    await waitFor(() => expect(result.current.toast?.type).toBe('error'));
    expect(result.current.toast?.message).toBe('home.projectRow.popups.projectRestoreConflict');

    await act(async () => {
      await result.current.permanentlyDeleteProject('proj-1');
    });
    await waitFor(() => expect(result.current.toast?.type).toBe('error'));
    expect(result.current.toast?.message).toBe('home.projectRow.popups.projectPermanentDeleteConflict');
  });
});
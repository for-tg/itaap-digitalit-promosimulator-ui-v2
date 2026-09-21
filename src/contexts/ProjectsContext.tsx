import {
  createContext,
  useContext,
  useState,
  useReducer,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { useTranslation } from 'react-i18next';

import type { Project, Scenario, CreateProjectPayload, ApiScenarioStatus, ApiScenario } from '~/types/project';
import {
  mapApiProjectToProject,
  mapDashboardProjectToProject,
  mapApiScenarioToScenario,
} from '~/types/project';
import {
  fetchDashboard,
  fetchProjects,
  fetchDeletedProjects,
  createProject as apiCreateProject,
  deleteProject as apiDeleteProject,
  permanentlyDeleteProject as apiPermanentlyDeleteProject,
  restoreProject as apiRestoreProject,
  updateProject as apiUpdateProject,
  fetchScenarios,
  fetchDeletedScenarios,
  fetchDeletedScenariosDashboard,
  createScenario as apiCreateScenario,
  deleteScenario as apiDeleteScenario,
  permanentlyDeleteScenario as apiPermanentlyDeleteScenario,
  deleteScenarioConfig as apiDeleteScenarioConfig,
  deleteOptimizationResult as apiDeleteOptimizationResult,
  restoreScenario as apiRestoreScenario,
  updateScenario as apiUpdateScenario,
} from '~/services/projectService';
import { isAPIError } from '~/utils/apiClient';

type ApiErrorDetailItem = {
  msg?: string;
  loc?: Array<string | number>;
};

const isApiErrorDetailItem = (value: unknown): value is ApiErrorDetailItem => (
  typeof value === 'object' && value !== null
);

const getActionErrorMessage = (
  error: unknown,
  fallbackMessage: string,
  duplicateMessage: string,
): string => {
  if (isAPIError(error)) {
    if (error.response?.status === 409) {
      return duplicateMessage;
    }

    if (typeof error.response?.data === 'string' && error.response.data.trim()) {
      return error.response.data;
    }

    if (
      typeof error.response?.data === 'object' &&
      error.response?.data !== null &&
      'message' in error.response.data &&
      typeof error.response.data.message === 'string' &&
      error.response.data.message.trim()
    ) {
      return error.response.data.message;
    }

    if (
      typeof error.response?.data === 'object' &&
      error.response?.data !== null &&
      'detail' in error.response.data &&
      typeof error.response.data.detail === 'string'
    ) {
      return error.response.data.detail;
    }

    if (
      typeof error.response?.data === 'object' &&
      error.response?.data !== null &&
      'detail' in error.response.data &&
      Array.isArray(error.response.data.detail)
    ) {
      const detailMessage = error.response.data.detail
        .filter(isApiErrorDetailItem)
        .map((detail: ApiErrorDetailItem) => {
          const location = Array.isArray(detail.loc) ? detail.loc.join('.') : '';
          return location && detail.msg ? `${location}: ${detail.msg}` : detail.msg ?? '';
        })
        .filter(Boolean)
        .join('; ');

      if (detailMessage) {
        return detailMessage;
      }
    }
  }

  return error instanceof Error ? error.message : fallbackMessage;
};

const normalizeName = (value: string) => value.trim().toLowerCase();

interface ProjectsContextValue {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  toast: { message: string; type: 'success' | 'error' } | null;
  expandedIds: Set<string>;
  toggleExpanded: (id: string, loadActiveScenarios?: boolean) => void;
  createProject: (payload: CreateProjectPayload) => Promise<Project>;
  updateProject: (id: string, name: string, description: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  restoreProject: (id: string) => Promise<void>;
  permanentlyDeleteProject: (id: string) => Promise<void>;
  addScenario: (projectId: string, name: string) => Promise<void>;
  renameScenario: (projectId: string, scenarioId: string, name: string) => Promise<void>;
  deleteScenario: (projectId: string, scenarioId: string) => Promise<void>;
  permanentlyDeleteScenario: (projectId: string, scenarioId: string) => Promise<void>;
  restoreScenario: (projectId: string, scenarioId: string) => Promise<void>;
  loadProjects: () => Promise<void>;
  loadScenariosForProject: (projectId: string) => Promise<void>;
  loadDeletedScenariosForProject: (projectId: string) => Promise<void>;
  updateScenarioStatusLocally: (projectId: string, scenarioId: string, status: ApiScenarioStatus) => void;
}

// ── Projects data state managed by a single reducer ────────────────────────
type DataState = {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
};

type DataAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; projects: Project[] }
  | { type: 'LOAD_ERROR'; message: string }
  | { type: 'ADD_PROJECT'; project: Project }
  | { type: 'REMOVE_PROJECT'; id: string }
  | { type: 'PATCH_PROJECT'; id: string; patch: Partial<Project> }
  | { type: 'SET_SCENARIOS'; projectId: string; scenarios: Scenario[] }
  | { type: 'ADD_SCENARIO'; projectId: string; scenario: Scenario }
  | { type: 'REMOVE_SCENARIO'; projectId: string; scenarioId: string }
  | { type: 'PATCH_SCENARIO'; projectId: string; scenarioId: string; patch: Partial<Scenario> };

function dataReducer(state: DataState, action: DataAction): DataState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, isLoading: true, error: null };
    case 'LOAD_SUCCESS':
      return { projects: action.projects, isLoading: false, error: null };
    case 'LOAD_ERROR':
      return { ...state, isLoading: false, error: action.message };
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.project] };
    case 'REMOVE_PROJECT':
      return { ...state, projects: state.projects.filter((p) => p.id !== action.id) };
    case 'PATCH_PROJECT':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.id ? { ...p, ...action.patch } : p
        ),
      };
    case 'SET_SCENARIOS':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.projectId ? { ...p, scenarios: action.scenarios } : p
        ),
      };
    case 'ADD_SCENARIO':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.projectId
            ? { ...p, scenarios: [...p.scenarios, action.scenario] }
            : p
        ),
      };
    case 'REMOVE_SCENARIO':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.projectId
            ? { ...p, scenarios: p.scenarios.filter((s) => s.id !== action.scenarioId) }
            : p
        ),
      };
    case 'PATCH_SCENARIO':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.projectId
            ? {
                ...p,
                scenarios: p.scenarios.map((s) =>
                  s.id === action.scenarioId ? { ...s, ...action.patch } : s
                ),
              }
            : p
        ),
      };
    default:
      return state;
  }
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export const ProjectsProvider = ({ children }: { children: ReactNode }) => {
  const { inProgress, instance, accounts } = useMsal();
  const { t } = useTranslation();
  const [{ projects, isLoading, error }, dispatch] = useReducer(dataReducer, {
    projects: [],
    isLoading: false,
    error: null,
  });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks which project IDs have had their scenarios fetched in this session
  const loadedScenarioIds = useRef<Set<string>>(new Set());
  const loadedDeletedScenarioIds = useRef<Set<string>>(new Set());
  const hasLoadedDeletedScenariosDashboard = useRef(false);
  const isLoadingDeletedScenariosDashboard = useRef(false);
  // Tracks in-flight scenario fetches to avoid duplicate requests during rapid rerenders.
  const loadingScenarioIds = useRef<Set<string>>(new Set());
  const loadingDeletedScenarioIds = useRef<Set<string>>(new Set());
  // Prevents auto-fetch from re-firing on subsequent MSAL interaction state changes
  const hasFetched = useRef(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const mergeDeletedApiScenariosIntoProjects = useCallback(
    (baseProjects: Project[], apiDeletedScenarios: ApiScenario[]): Project[] => {
      const deletedScenariosByProject = new Map<string, Scenario[]>();

      for (const apiScenario of apiDeletedScenarios) {
        if (!apiScenario.is_deleted) {
          continue;
        }

        const mappedScenario = mapApiScenarioToScenario(apiScenario);
        const existing = deletedScenariosByProject.get(apiScenario.project_id) ?? [];
        existing.push(mappedScenario);
        deletedScenariosByProject.set(apiScenario.project_id, existing);
      }

      return baseProjects.map((project) => {
        const deletedScenarios = deletedScenariosByProject.get(project.id);
        if (!deletedScenarios || deletedScenarios.length === 0) {
          return project;
        }

        const existingScenarioIds = new Set(project.scenarios.map((scenario) => scenario.id));
        const mergedScenarios = [
          ...project.scenarios,
          ...deletedScenarios.filter((scenario) => !existingScenarioIds.has(scenario.id)),
        ];

        return { ...project, scenarios: mergedScenarios };
      });
    },
    [],
  );

  const loadProjects = useCallback(async () => {
    dispatch({ type: 'LOAD_START' });
    try {
      const activeAccount = instance.getActiveAccount() ?? accounts[0] ?? null;
      const dashboardUserId =
        activeAccount?.localAccountId ||
        activeAccount?.homeAccountId ||
        activeAccount?.username;

      const dashboardResponse = await fetchDashboard(dashboardUserId ?? undefined);
      if (dashboardResponse.projects.length > 0) {
        const mappedFromDashboard = dashboardResponse.projects.map(mapDashboardProjectToProject);
        const projectsById = new Map(mappedFromDashboard.map((project) => [project.id, project]));

        // Enrich dashboard data with deleted projects from the legacy endpoint.
        try {
          const deletedProjectsResult = await fetchDeletedProjects();
          for (const deletedProject of deletedProjectsResult.projects ?? []) {
            if (!projectsById.has(deletedProject.project_id)) {
              projectsById.set(
                deletedProject.project_id,
                mapApiProjectToProject(deletedProject, []),
              );
            }
          }
        } catch {
          // Non-fatal: dashboard data remains primary source.
        }

        let mergedProjects = [...projectsById.values()];

        try {
          const deletedScenariosDashboard = await fetchDeletedScenariosDashboard();
          mergedProjects = mergeDeletedApiScenariosIntoProjects(
            mergedProjects,
            deletedScenariosDashboard.scenarios ?? [],
          );
          loadedDeletedScenarioIds.current = new Set(mergedProjects.map((project) => project.id));
          hasLoadedDeletedScenariosDashboard.current = true;
        } catch {
          loadedDeletedScenarioIds.current = new Set();
          hasLoadedDeletedScenariosDashboard.current = false;
        }

        // Dashboard provides a summary; keep scenarios refreshable per project when needed.
        loadedScenarioIds.current = new Set();
        loadingScenarioIds.current = new Set();
        loadingDeletedScenarioIds.current = new Set();
        isLoadingDeletedScenariosDashboard.current = false;
        dispatch({ type: 'LOAD_SUCCESS', projects: mergedProjects });
        return;
      }
    } catch {
      // Fall back to legacy project endpoints if dashboard API is unavailable.
    }

    try {
      const [projectsResult, deletedProjectsResult, deletedScenariosDashboardResult] = await Promise.allSettled([
        fetchProjects(),
        fetchDeletedProjects(),
        fetchDeletedScenariosDashboard(),
      ]);

      if (projectsResult.status === 'rejected') {
        throw projectsResult.reason;
      }

      const projectsList = projectsResult.value;
      const deletedProjects = deletedProjectsResult.status === 'fulfilled'
        ? deletedProjectsResult.value.projects
        : [];
      const allProjects = [...projectsList.projects, ...deletedProjects];
      const projectsWithScenarios = await Promise.all(
        allProjects.map(async (project) => {
          const activeScenariosResult = await Promise.allSettled([
            fetchScenarios(project.project_id),
          ]);

          const activeScenarios =
            activeScenariosResult[0].status === 'fulfilled'
              ? activeScenariosResult[0].value.scenarios
              : [];
          const scenarios = activeScenarios.map(mapApiScenarioToScenario);

          return mapApiProjectToProject(project, scenarios);
        }),
      );

      const mergedProjects = deletedScenariosDashboardResult.status === 'fulfilled'
        ? mergeDeletedApiScenariosIntoProjects(
            projectsWithScenarios,
            deletedScenariosDashboardResult.value.scenarios ?? [],
          )
        : projectsWithScenarios;

      loadedScenarioIds.current = new Set(mergedProjects.map((project) => project.id));
      loadedDeletedScenarioIds.current = deletedScenariosDashboardResult.status === 'fulfilled'
        ? new Set(mergedProjects.map((project) => project.id))
        : new Set();
      hasLoadedDeletedScenariosDashboard.current = deletedScenariosDashboardResult.status === 'fulfilled';
      isLoadingDeletedScenariosDashboard.current = false;
      loadingScenarioIds.current = new Set();
      loadingDeletedScenarioIds.current = new Set();

      dispatch({ type: 'LOAD_SUCCESS', projects: mergedProjects });
    } catch (err) {
      const msg = getActionErrorMessage(
        err,
        'Failed to load projects',
        'Projects request conflicts with current state.',
      );
      dispatch({ type: 'LOAD_ERROR', message: msg });
    }
  }, [accounts, instance]);

  // Wait for MSAL to finish initializing before fetching
  useEffect(() => {
    if (inProgress !== InteractionStatus.None) return;
    if (hasFetched.current) return;
    hasFetched.current = true;
    void loadProjects();
  }, [inProgress, loadProjects]);

  const loadScenariosForProject = useCallback(async (projectId: string) => {
    if (loadedScenarioIds.current.has(projectId)) return;
    if (loadingScenarioIds.current.has(projectId)) return;
    loadingScenarioIds.current.add(projectId);
    try {
      const activeData = await fetchScenarios(projectId);
      const activeScenarios = activeData.scenarios.map(mapApiScenarioToScenario);
      const project = projects.find((p) => p.id === projectId);
      const existingDeletedScenarios = project?.scenarios.filter((scenario) => scenario.deleted) ?? [];
      const activeScenarioIds = new Set(activeScenarios.map((scenario) => scenario.id));
      const mergedScenarios = [
        ...activeScenarios,
        ...existingDeletedScenarios.filter((scenario) => !activeScenarioIds.has(scenario.id)),
      ];
      dispatch({ type: 'SET_SCENARIOS', projectId, scenarios: mergedScenarios });
      loadedScenarioIds.current.add(projectId);
    } catch {
      // non-fatal: scenarios list stays empty
    } finally {
      loadingScenarioIds.current.delete(projectId);
    }
  }, [projects]);

  const loadDeletedScenariosForProject = useCallback(async (projectId: string) => {
    if (loadedDeletedScenarioIds.current.has(projectId)) return;
    if (loadingDeletedScenarioIds.current.has(projectId)) return;
    if (hasLoadedDeletedScenariosDashboard.current) {
      loadedDeletedScenarioIds.current.add(projectId);
      return;
    }

    loadingDeletedScenarioIds.current.add(projectId);
    try {
      if (isLoadingDeletedScenariosDashboard.current) {
        return;
      }
      isLoadingDeletedScenariosDashboard.current = true;

      const deletedData = await fetchDeletedScenariosDashboard();
      const mergedProjects = mergeDeletedApiScenariosIntoProjects(
        projects,
        deletedData.scenarios ?? [],
      );

      for (const mergedProject of mergedProjects) {
        const existingProject = projects.find((project) => project.id === mergedProject.id);
        if (!existingProject) {
          continue;
        }
        if (existingProject.scenarios.length !== mergedProject.scenarios.length) {
          dispatch({
            type: 'SET_SCENARIOS',
            projectId: mergedProject.id,
            scenarios: mergedProject.scenarios,
          });
        }
      }

      loadedDeletedScenarioIds.current = new Set(mergedProjects.map((project) => project.id));
      hasLoadedDeletedScenariosDashboard.current = true;
    } catch {
      // non-fatal: scenario list remains unchanged
    } finally {
      isLoadingDeletedScenariosDashboard.current = false;
      loadingDeletedScenarioIds.current.delete(projectId);
    }
  }, [mergeDeletedApiScenariosIntoProjects, projects]);

  const toggleExpanded = useCallback(
    (id: string, loadActiveScenarios = true) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
          if (loadActiveScenarios) {
            void loadScenariosForProject(id);
          }
        }
        return next;
      });
    },
    [loadScenariosForProject]
  );

  const createProject = useCallback(
    async (payload: CreateProjectPayload): Promise<Project> => {
      const trimmedName = payload.name.trim();
      const nameAlreadyExists = projects.some(
        (project) => normalizeName(project.name) === normalizeName(trimmedName),
      );

      if (nameAlreadyExists) {
        const msg = t('home.projectRow.popups.projectExists', { name: trimmedName });
        showToast(msg, 'error');
        throw new Error(msg);
      }
      const activeAccount = instance.getActiveAccount() ?? accounts[0] ?? null;
      const USER_ID =
        activeAccount?.localAccountId ||
        activeAccount?.homeAccountId ||
        activeAccount?.username ||
        'local-user'; // fallback when SSO is disabled (local dev / demo mode)

      try {
        const apiProject = await apiCreateProject({
          user_id: USER_ID,
          project_name: trimmedName,
          markets: [payload.market],
          mags: [payload.mag],
          retailers: [payload.retailer],
          description: payload.description,
        });
        const project = mapApiProjectToProject(apiProject, []);
        loadedScenarioIds.current.add(project.id);
        dispatch({ type: 'ADD_PROJECT', project });
        setExpandedIds((prev) => new Set([...prev, project.id]));
        showToast(t('home.projectRow.popups.projectCreated'));
        return project;
      } catch (error) {
        const msg = getActionErrorMessage(
          error,
          t('home.projectRow.popups.projectCreateFailed'),
          t('home.projectRow.popups.projectExists', { name: payload.name.trim() })
        );
        showToast(msg, 'error');
        throw new Error(msg);
      }
    },
    [projects, showToast, t]
  );

  const deleteProject = useCallback(async (id: string) => {
    const deleteProjectOnce = async () => {
      await apiDeleteProject(id);
      dispatch({ type: 'PATCH_PROJECT', id, patch: { deleted: true } });
      showToast(t('home.projectRow.popups.projectDeleted'));
    };

    const cleanupProjectScenarioArtifacts = async (scenarioIds: string[]) => {
      if (scenarioIds.length === 0) {
        return;
      }

      await Promise.allSettled(
        scenarioIds.flatMap((scenarioId) => [
          apiDeleteScenarioConfig(scenarioId),
          apiDeleteOptimizationResult(scenarioId),
        ]),
      );
    };

    const fetchProjectScenarioIds = async () => {
      const [activeRes, deletedRes] = await Promise.allSettled([
        fetchScenarios(id),
        fetchDeletedScenarios(id),
      ]);

      const activeScenarioIds = activeRes.status === 'fulfilled'
        ? activeRes.value.scenarios.map((scenario) => scenario.scenario_id)
        : [];

      const deletedScenarioIds = deletedRes.status === 'fulfilled'
        ? deletedRes.value.scenarios.map((scenario) => scenario.scenario_id)
        : [];

      return { activeScenarioIds, deletedScenarioIds };
    };

    const permanentlyDeleteProjectFallback = async () => {
      await apiPermanentlyDeleteProject(id);
      dispatch({ type: 'REMOVE_PROJECT', id });
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      loadedScenarioIds.current.delete(id);
      loadedDeletedScenarioIds.current.delete(id);
      loadingScenarioIds.current.delete(id);
      loadingDeletedScenarioIds.current.delete(id);
      showToast(t('home.projectRow.popups.projectPermanentlyDeleted'));
    };

    try {
      await deleteProjectOnce();
    } catch (error) {
      if (isAPIError(error) && error.response?.status === 500) {
        try {
          const { activeScenarioIds, deletedScenarioIds } =
            await fetchProjectScenarioIds();

          await cleanupProjectScenarioArtifacts([
            ...activeScenarioIds,
            ...deletedScenarioIds,
          ]);

          if (activeScenarioIds.length > 0) {
            await Promise.allSettled(
              activeScenarioIds.map((scenarioId) => apiDeleteScenario(scenarioId)),
            );
          }

          await deleteProjectOnce();
          return;
        } catch (retryError) {
          if (isAPIError(retryError) && retryError.response?.status === 500) {
            try {
              const { deletedScenarioIds } = await fetchProjectScenarioIds();
              await Promise.allSettled(
                deletedScenarioIds.map((scenarioId) =>
                  apiPermanentlyDeleteScenario(scenarioId),
                ),
              );
              await deleteProjectOnce();
              return;
            } catch {
              try {
                await permanentlyDeleteProjectFallback();
                return;
              } catch {
                // Continue to common error handling below.
              }
            }
          }
        }
      }

      const msg = getActionErrorMessage(
        error,
        t('home.projectRow.popups.projectDeleteFailed'),
        t('home.projectRow.popups.projectDeleteConflict'),
      );
      showToast(msg, 'error');
    }
  }, [showToast, t]);

  const restoreProject = useCallback(async (id: string) => {
    try {
      await apiRestoreProject(id);
    } catch (error) {
      const msg = getActionErrorMessage(
        error,
        t('home.projectRow.popups.projectRestoreFailed'),
        t('home.projectRow.popups.projectRestoreConflict'),
      );
      showToast(msg, 'error');
      return;
    }
    dispatch({ type: 'PATCH_PROJECT', id, patch: { deleted: false } });
    showToast(t('home.projectRow.popups.projectRestored'));
  }, [showToast, t]);

  const permanentlyDeleteProject = useCallback(async (id: string) => {
    try {
      await apiPermanentlyDeleteProject(id);
    } catch (error) {
      const msg = getActionErrorMessage(
        error,
        t('home.projectRow.popups.projectPermanentDeleteFailed'),
        t('home.projectRow.popups.projectPermanentDeleteConflict'),
      );
      showToast(msg, 'error');
      return;
    }
    dispatch({ type: 'REMOVE_PROJECT', id });
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    loadedScenarioIds.current.delete(id);
    loadedDeletedScenarioIds.current.delete(id);
    loadingScenarioIds.current.delete(id);
    loadingDeletedScenarioIds.current.delete(id);
  }, [showToast, t]);

  const updateProject = useCallback(async (id: string, name: string, description: string) => {
    try {
      const apiProject = await apiUpdateProject(id, { project_name: name, description });
      dispatch({
        type: 'PATCH_PROJECT',
        id,
        patch: { name: apiProject.project_name, description: apiProject.description ?? '' },
      });
      showToast(t('home.projectRow.popups.projectUpdated'));
    } catch (err) {
      showToast(t('errors.updateProjectFailed'), 'error');
      throw err;
    }
  }, [showToast, t]);

  const addScenario = useCallback(
    async (projectId: string, name: string) => {
      const trimmedName = name.trim();
      const project = projects.find((item) => item.id === projectId);
      const alreadyExists = project?.scenarios.some(
        (scenario) => normalizeName(scenario.name) === normalizeName(trimmedName),
      ) ?? false;

      if (alreadyExists) {
        showToast(t('home.projectRow.popups.scenarioExists', { name: trimmedName }), 'error');
        return;
      }

      try {
        const apiScenario = await apiCreateScenario(projectId, trimmedName);
        const scenario = mapApiScenarioToScenario(apiScenario);
        dispatch({ type: 'ADD_SCENARIO', projectId, scenario });
        showToast(t('home.projectRow.popups.scenarioAdded'));
      } catch (error) {
        const msg = getActionErrorMessage(
          error,
          t('home.projectRow.popups.scenarioAddFailed'),
          t('home.projectRow.popups.scenarioExists', { name: trimmedName })
        );
        showToast(msg, 'error');
      }
    },
    [projects, showToast, t]
  );

  const renameScenario = useCallback(
    async (projectId: string, scenarioId: string, name: string) => {
      try {
        await apiUpdateScenario(scenarioId, { scenario_name: name.trim() });
        dispatch({ type: 'PATCH_SCENARIO', projectId, scenarioId, patch: { name: name.trim() } });
        showToast(t('home.projectRow.popups.scenarioRenamed'));
      } catch {
        showToast(t('home.projectRow.popups.scenarioRenameFailed'), 'error');
      }
    },
    [showToast, t]
  );

  const deleteScenario = useCallback(
    async (projectId: string, scenarioId: string) => {
      try {
        await apiDeleteScenario(scenarioId);
        dispatch({ type: 'PATCH_SCENARIO', projectId, scenarioId, patch: { deleted: true } });
        showToast(t('home.projectRow.popups.scenarioDeleted'));
      } catch (error) {
        const msg = getActionErrorMessage(
          error,
          t('home.projectRow.popups.scenarioDeleteFailed'),
          t('home.projectRow.popups.scenarioDeleteConflict'),
        );
        showToast(msg, 'error');
      }
    },
    [showToast, t]
  );

  const permanentlyDeleteScenario = useCallback(
    async (projectId: string, scenarioId: string) => {
      try {
        await apiPermanentlyDeleteScenario(scenarioId);
      } catch (error) {
        if (isAPIError(error) && error.response?.status === 500) {
          try {
            // Retry once after auxiliary cleanup to handle backend FK/consistency issues.
            await Promise.allSettled([
              apiDeleteScenarioConfig(scenarioId),
              apiDeleteOptimizationResult(scenarioId),
            ]);
            await apiPermanentlyDeleteScenario(scenarioId);
          } catch (retryError) {
            const retryMsg = getActionErrorMessage(
              retryError,
              t('home.projectRow.popups.scenarioPermanentDeleteFailed'),
              t('home.projectRow.popups.scenarioPermanentDeleteConflict'),
            );
            showToast(retryMsg, 'error');
            return;
          }
        } else {
        const msg = getActionErrorMessage(
          error,
          t('home.projectRow.popups.scenarioPermanentDeleteFailed'),
          t('home.projectRow.popups.scenarioPermanentDeleteConflict'),
        );
        showToast(msg, 'error');
        return;
        }
      }

      dispatch({ type: 'REMOVE_SCENARIO', projectId, scenarioId });
      showToast(t('home.projectRow.popups.scenarioPermanentlyDeleted'));
    },
    [showToast, t]
  );

  const restoreScenario = useCallback(async (projectId: string, scenarioId: string) => {
    try {
      await apiRestoreScenario(scenarioId);
    } catch (error) {
      const msg = getActionErrorMessage(
        error,
        t('home.projectRow.popups.scenarioRestoreFailed'),
        t('home.projectRow.popups.scenarioRestoreConflict'),
      );
      showToast(msg, 'error');
      return;
    }
    dispatch({ type: 'PATCH_SCENARIO', projectId, scenarioId, patch: { deleted: false } });
    showToast(t('home.projectRow.popups.scenarioRestored'));
  }, [showToast, t]);

  const updateScenarioStatusLocally = useCallback(
    (projectId: string, scenarioId: string, status: ApiScenarioStatus) => {
      dispatch({ type: 'PATCH_SCENARIO', projectId, scenarioId, patch: { status } });
    },
    []
  );

  const ctxValue = useMemo<ProjectsContextValue>(
    () => ({
      projects,
      isLoading,
      error,
      toast,
      expandedIds,
      toggleExpanded,
      createProject,
      updateProject,
      deleteProject,
      restoreProject,
      permanentlyDeleteProject,
      addScenario,
      renameScenario,
      deleteScenario,
      permanentlyDeleteScenario,
      restoreScenario,
      loadProjects,
      loadScenariosForProject,
      loadDeletedScenariosForProject,
      updateScenarioStatusLocally,
    }),
    [
      projects, isLoading, error, toast, expandedIds,
      toggleExpanded, createProject, updateProject, deleteProject,
      restoreProject, permanentlyDeleteProject,
      addScenario, renameScenario, deleteScenario, permanentlyDeleteScenario,
      restoreScenario,
      loadProjects, loadScenariosForProject, loadDeletedScenariosForProject, updateScenarioStatusLocally,
    ],
  );

  return (
    <ProjectsContext.Provider value={ctxValue}>
      {children}
    </ProjectsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useProjects = (): ProjectsContextValue => {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('useProjects must be used inside ProjectsProvider');
  return ctx;
};

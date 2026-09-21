import { axiosInstance } from '~/utils/apiClient';
import type {
  ApiProject,
  ApiScenario,
  ApiProjectsListResponse,
  ApiScenariosListResponse,
  ApiCreateProjectPayload,
  ApiUpdateProjectPayload,
  ApiScenarioConfig,
  ApiSaveScenarioConfigPayload,
  ApiOptimizationResult,
  ApiScenarioOptimizeResponse,
  ApiDashboardResponse,
  ApiSkuMasterListResponse,
  ApiSkuMasterItem,
  ApiSkuSyncResponse,
} from '~/types/project';

const API_PREFIX = '/itaap-digitalit-promosimulator-coreservice/api';

// ── Projects ─────────────────────────────────────────────────────────────────

export async function fetchProjects(): Promise<ApiProjectsListResponse> {
  const res = await axiosInstance.get<ApiProjectsListResponse>(`${API_PREFIX}/projects`);
  return res.data;
}

export async function fetchDeletedProjects(): Promise<ApiProjectsListResponse> {
  const res = await axiosInstance.get<ApiProjectsListResponse>(`${API_PREFIX}/projects/deleted`);
  return res.data;
}

export async function fetchDashboard(userId?: string): Promise<ApiDashboardResponse> {
  const res = await axiosInstance.get<ApiDashboardResponse>(`${API_PREFIX}/dashboard`, {
    params: { user_id: userId || 'local-user' },
  });
  return res.data;
}

export async function createProject(payload: ApiCreateProjectPayload): Promise<ApiProject> {
  const res = await axiosInstance.post<ApiProject>(`${API_PREFIX}/projects`, payload);
  return res.data;
}

export async function getProject(projectId: string): Promise<ApiProject> {
  const res = await axiosInstance.get<ApiProject>(`${API_PREFIX}/projects/${projectId}`);
  return res.data;
}

export async function updateProject(
  projectId: string,
  payload: ApiUpdateProjectPayload,
): Promise<ApiProject> {
  const res = await axiosInstance.put<ApiProject>(
    `${API_PREFIX}/projects/${projectId}`,
    payload,
  );
  return res.data;
}

export async function deleteProject(projectId: string): Promise<void> {
  await axiosInstance.delete(`${API_PREFIX}/projects/${projectId}`);
}

export async function permanentlyDeleteProject(projectId: string): Promise<void> {
  await axiosInstance.delete(`${API_PREFIX}/projects/${projectId}`, {
    params: { delete_permanently: true },
  });
}

export async function restoreProject(projectId: string): Promise<ApiProject> {
  const res = await axiosInstance.post<ApiProject>(
    `${API_PREFIX}/projects/${projectId}/restore`,
  );
  return res.data;
}

// ── Scenarios ────────────────────────────────────────────────────────────────

export async function fetchScenarios(projectId: string): Promise<ApiScenariosListResponse> {
  const res = await axiosInstance.get<ApiScenariosListResponse>(
    `${API_PREFIX}/projects/${projectId}/scenarios`,
  );
  return res.data;
}

export async function fetchDeletedScenarios(projectId: string): Promise<ApiScenariosListResponse> {
  const res = await axiosInstance.get<ApiScenariosListResponse>(
    `${API_PREFIX}/projects/${projectId}/scenarios/deleted`,
  );
  return res.data;
}

export async function fetchDeletedScenariosDashboard(): Promise<ApiScenariosListResponse> {
  const res = await axiosInstance.get<ApiScenariosListResponse>(
    `${API_PREFIX}/scenarios/deleted`,
  );
  return res.data;
}

export async function createScenario(
  projectId: string,
  scenarioName: string,
): Promise<ApiScenario> {
  const res = await axiosInstance.post<ApiScenario>(
    `${API_PREFIX}/projects/${projectId}/scenarios`,
    { scenario_name: scenarioName },
  );
  return res.data;
}

export async function getScenario(scenarioId: string): Promise<ApiScenario> {
  const res = await axiosInstance.get<ApiScenario>(`${API_PREFIX}/scenarios/${scenarioId}`);
  return res.data;
}

export async function updateScenario(
  scenarioId: string,
  payload: { scenario_name?: string | null; status?: string },
): Promise<ApiScenario> {
  const res = await axiosInstance.put<ApiScenario>(
    `${API_PREFIX}/scenarios/${scenarioId}`,
    payload,
  );
  return res.data;
}

export async function deleteScenario(scenarioId: string): Promise<void> {
  await axiosInstance.delete(`${API_PREFIX}/scenarios/${scenarioId}`);
}

export async function permanentlyDeleteScenario(scenarioId: string): Promise<void> {
  await axiosInstance.delete(`${API_PREFIX}/scenarios/${scenarioId}`, {
    params: { delete_permanently: true },
  });
}

export async function restoreScenario(scenarioId: string): Promise<ApiScenario> {
  const res = await axiosInstance.post<ApiScenario>(`${API_PREFIX}/scenarios/${scenarioId}/restore`);
  return res.data;
}

// ── Scenario configuration ───────────────────────────────────────────────────

export async function getScenarioConfig(scenarioId: string): Promise<ApiScenarioConfig | null> {
  const res = await axiosInstance.get<ApiScenarioConfig | null>(
    `${API_PREFIX}/scenarios/${scenarioId}/config`,
  );
  return res.data;
}

export async function saveScenarioConfig(
  scenarioId: string,
  payload: ApiSaveScenarioConfigPayload,
): Promise<ApiScenarioConfig> {
  const res = await axiosInstance.put<ApiScenarioConfig>(
    `${API_PREFIX}/scenarios/${scenarioId}/config`,
    payload,
  );
  return res.data;
}

export async function deleteScenarioConfig(scenarioId: string): Promise<void> {
  await axiosInstance.delete(`${API_PREFIX}/scenarios/${scenarioId}/config`);
}

export async function runScenarioOptimize(
  scenarioId: string,
): Promise<ApiScenarioOptimizeResponse> {
  const res = await axiosInstance.post<ApiScenarioOptimizeResponse>(
    `${API_PREFIX}/scenarios/${scenarioId}/optimize`,
  );
  return res.data;
}

// ── Optimization result ──────────────────────────────────────────────────────

export async function getOptimizationResult(scenarioId: string): Promise<ApiOptimizationResult> {
  const res = await axiosInstance.get<ApiOptimizationResult>(
    `${API_PREFIX}/scenarios/${scenarioId}/optimization-result`,
  );
  return res.data;
}

export async function saveOptimizationResult(
  scenarioId: string,
  resultJson: unknown,
): Promise<ApiOptimizationResult> {
  const res = await axiosInstance.put<ApiOptimizationResult>(
    `${API_PREFIX}/scenarios/${scenarioId}/optimization-result`,
    { result_json: resultJson },
  );
  return res.data;
}

export async function deleteOptimizationResult(scenarioId: string): Promise<void> {
  await axiosInstance.delete(`${API_PREFIX}/scenarios/${scenarioId}/optimization-result`);
}

// ── SKU master ──────────────────────────────────────────────────────────────

export async function syncSkuMaster(): Promise<ApiSkuSyncResponse> {
  const res = await axiosInstance.post<ApiSkuSyncResponse>(`${API_PREFIX}/skus/sync`);
  return res.data;
}

export async function fetchSkuMaster(
  classification?: string,
): Promise<ApiSkuMasterListResponse> {
  const res = await axiosInstance.get<ApiSkuMasterListResponse>(`${API_PREFIX}/skus/master`, {
    params: classification ? { classification } : undefined,
  });
  return res.data;
}

export async function getSkuMasterById(skuId: string): Promise<ApiSkuMasterItem> {
  const res = await axiosInstance.get<ApiSkuMasterItem>(`${API_PREFIX}/skus/master/${skuId}`);
  return res.data;
}

// ── Health ───────────────────────────────────────────────────────────────────

export async function fetchCoreServiceHealth(): Promise<Record<string, unknown>> {
  const res = await axiosInstance.get<Record<string, unknown>>(
    `${API_PREFIX}/health`,
  );
  return res.data;
}

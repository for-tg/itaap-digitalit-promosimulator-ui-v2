import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('~/utils/apiClient', () => ({
  axiosInstance: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('~/utils/appConfig', () => ({
  appConfigs: { ENABLE_SSO: false },
}));

import { axiosInstance } from '~/utils/apiClient';
import {
  fetchCoreServiceHealth,
  fetchDashboard,
  fetchProjects,
  fetchDeletedProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  fetchScenarios,
  fetchDeletedScenarios,
  fetchDeletedScenariosDashboard,
  createScenario,
  getScenario,
  updateScenario,
  deleteScenario,
  permanentlyDeleteScenario,
  restoreScenario,
  getScenarioConfig,
  saveScenarioConfig,
  deleteScenarioConfig,
  runScenarioOptimize,
  getOptimizationResult,
  saveOptimizationResult,
  deleteOptimizationResult,
  syncSkuMaster,
  fetchSkuMaster,
  getSkuMasterById,
} from '~/services/projectService';
import type {
  ApiProject,
  ApiScenario,
  ApiProjectsListResponse,
  ApiScenariosListResponse,
  ApiScenarioConfig,
  ApiOptimizationResult,
  ApiDashboardResponse,
  ApiSkuMasterListResponse,
  ApiSkuMasterItem,
  ApiSkuSyncResponse,
  ApiScenarioOptimizeResponse,
  ApiCreateProjectPayload,
  ApiUpdateProjectPayload,
  ApiSaveScenarioConfigPayload,
} from '~/types/project';
import type { SimulationResponse } from '~/types/simulation';

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

const mockGet = vi.mocked(axiosInstance.get);
const mockPost = vi.mocked(axiosInstance.post);
const mockPut = vi.mocked(axiosInstance.put);
const mockDelete = vi.mocked(axiosInstance.delete);

const PREFIX = '/itaap-digitalit-promosimulator-coreservice/api';

const mockApiProject: ApiProject = {
  project_id: 'proj-1',
  project_name: 'Test Project',
  user_id: 'user-1',
  is_deleted: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-06-01T00:00:00Z',
  markets: ['CZ'],
  mags: ['RTB'],
  retailers: ['All'],
  description: 'desc',
};

const mockApiScenario: ApiScenario = {
  scenario_id: 'scen-1',
  project_id: 'proj-1',
  scenario_name: 'Scenario A',
  status: 'DRAFT',
  is_deleted: false,
  created_at: '2024-02-01T00:00:00Z',
  updated_at: '2024-07-01T00:00:00Z',
};

describe('projectService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Projects ────────────────────────────────────────────────────────────────

  describe('fetchProjects', () => {
    it('calls GET /projects and returns data', async () => {
      const response: ApiProjectsListResponse = { total: 1, projects: [mockApiProject] };
      mockGet.mockResolvedValue({ data: response });
      const result = await fetchProjects();
      expect(mockGet).toHaveBeenCalledWith(`${PREFIX}/projects`);
      expect(result).toEqual(response);
    });
  });

  describe('fetchDeletedProjects', () => {
    it('calls GET /projects/deleted and returns data', async () => {
      const response: ApiProjectsListResponse = { total: 1, projects: [mockApiProject] };
      mockGet.mockResolvedValue({ data: response });
      const result = await fetchDeletedProjects();
      expect(mockGet).toHaveBeenCalledWith(`${PREFIX}/projects/deleted`);
      expect(result).toEqual(response);
    });
  });

  describe('fetchDashboard', () => {
    it('calls GET /dashboard and returns data', async () => {
      const response: ApiDashboardResponse = { user_id: 'user-1', total_projects: 0, projects: [] };
      mockGet.mockResolvedValue({ data: response });
      const result = await fetchDashboard();
      expect(mockGet).toHaveBeenCalledWith(`${PREFIX}/dashboard`, { params: undefined });
      expect(result).toEqual(response);
    });
  });

  describe('createProject', () => {
    it('calls POST /projects with payload and returns created project', async () => {
      const payload: ApiCreateProjectPayload = {
        user_id: 'user123',
        project_name: 'New Project',
        markets: ['CZ'],
        mags: ['RTB'],
        retailers: ['All'],
        description: '',
      };
      mockPost.mockResolvedValue({ data: mockApiProject });
      const result = await createProject(payload);
      expect(mockPost).toHaveBeenCalledWith(`${PREFIX}/projects`, payload);
      expect(result).toEqual(mockApiProject);
    });
  });

  describe('getProject', () => {
    it('calls GET /projects/:id and returns the project', async () => {
      mockGet.mockResolvedValue({ data: mockApiProject });
      const result = await getProject('proj-1');
      expect(mockGet).toHaveBeenCalledWith(`${PREFIX}/projects/proj-1`);
      expect(result).toEqual(mockApiProject);
    });
  });

  describe('updateProject', () => {
    it('calls PUT /projects/:id with payload and returns updated project', async () => {
      const payload: ApiUpdateProjectPayload = { project_name: 'Updated' };
      mockPut.mockResolvedValue({ data: mockApiProject });
      const result = await updateProject('proj-1', payload);
      expect(mockPut).toHaveBeenCalledWith(`${PREFIX}/projects/proj-1`, payload);
      expect(result).toEqual(mockApiProject);
    });
  });

  describe('deleteProject', () => {
    it('calls DELETE /projects/:id', async () => {
      mockDelete.mockResolvedValue({ data: undefined });
      await deleteProject('proj-1');
      expect(mockDelete).toHaveBeenCalledWith(`${PREFIX}/projects/proj-1`);
    });
  });

  // ── Scenarios ───────────────────────────────────────────────────────────────

  describe('fetchScenarios', () => {
    it('calls GET /projects/:id/scenarios and returns list', async () => {
      const response: ApiScenariosListResponse = { total: 1, scenarios: [mockApiScenario] };
      mockGet.mockResolvedValue({ data: response });
      const result = await fetchScenarios('proj-1');
      expect(mockGet).toHaveBeenCalledWith(`${PREFIX}/projects/proj-1/scenarios`);
      expect(result).toEqual(response);
    });
  });

  describe('fetchDeletedScenarios', () => {
    it('calls GET /projects/:id/scenarios/deleted and returns list', async () => {
      const response: ApiScenariosListResponse = { total: 1, scenarios: [mockApiScenario] };
      mockGet.mockResolvedValue({ data: response });
      const result = await fetchDeletedScenarios('proj-1');
      expect(mockGet).toHaveBeenCalledWith(`${PREFIX}/projects/proj-1/scenarios/deleted`);
      expect(result).toEqual(response);
    });
  });

  describe('fetchDeletedScenariosDashboard', () => {
    it('calls GET /scenarios/deleted and returns list', async () => {
      const response: ApiScenariosListResponse = { total: 1, scenarios: [mockApiScenario] };
      mockGet.mockResolvedValue({ data: response });
      const result = await fetchDeletedScenariosDashboard();
      expect(mockGet).toHaveBeenCalledWith(`${PREFIX}/scenarios/deleted`);
      expect(result).toEqual(response);
    });
  });

  describe('createScenario', () => {
    it('calls POST /projects/:id/scenarios with scenario_name and returns scenario', async () => {
      mockPost.mockResolvedValue({ data: mockApiScenario });
      const result = await createScenario('proj-1', 'Scenario A');
      expect(mockPost).toHaveBeenCalledWith(`${PREFIX}/projects/proj-1/scenarios`, {
        scenario_name: 'Scenario A',
      });
      expect(result).toEqual(mockApiScenario);
    });
  });

  describe('getScenario', () => {
    it('calls GET /scenarios/:id and returns scenario', async () => {
      mockGet.mockResolvedValue({ data: mockApiScenario });
      const result = await getScenario('scen-1');
      expect(mockGet).toHaveBeenCalledWith(`${PREFIX}/scenarios/scen-1`);
      expect(result).toEqual(mockApiScenario);
    });
  });

  describe('updateScenario', () => {
    it('calls PUT /scenarios/:id with payload and returns scenario', async () => {
      const payload = { scenario_name: 'Renamed', status: 'COMPLETED' };
      mockPut.mockResolvedValue({ data: mockApiScenario });
      const result = await updateScenario('scen-1', payload);
      expect(mockPut).toHaveBeenCalledWith(`${PREFIX}/scenarios/scen-1`, payload);
      expect(result).toEqual(mockApiScenario);
    });
  });

  describe('deleteScenario', () => {
    it('calls DELETE /scenarios/:id', async () => {
      mockDelete.mockResolvedValue({ data: undefined });
      await deleteScenario('scen-1');
      expect(mockDelete).toHaveBeenCalledWith(`${PREFIX}/scenarios/scen-1`);
    });
  });

  describe('permanentlyDeleteScenario', () => {
    it('calls DELETE /scenarios/:id with delete_permanently=true', async () => {
      mockDelete.mockResolvedValue({ data: undefined });
      await permanentlyDeleteScenario('scen-1');
      expect(mockDelete).toHaveBeenCalledWith(`${PREFIX}/scenarios/scen-1`, {
        params: { delete_permanently: true },
      });
    });
  });

  describe('restoreScenario', () => {
    it('calls POST /scenarios/:id/restore and returns scenario', async () => {
      mockPost.mockResolvedValue({ data: mockApiScenario });
      const result = await restoreScenario('scen-1');
      expect(mockPost).toHaveBeenCalledWith(`${PREFIX}/scenarios/scen-1/restore`);
      expect(result).toEqual(mockApiScenario);
    });
  });

  // ── Scenario configuration ───────────────────────────────────────────────────

  describe('getScenarioConfig', () => {
    it('calls GET /scenarios/:id/config and returns config', async () => {
      const config: ApiScenarioConfig = {
        scenario_id: 'scen-1',
        analysis_type: 'retro',
        selected_skus: ['HX9911/09'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        objective: 'profit',
        year: 2024,
        plan_year: null,
        base_year: null,
        reference_year: 2023,
        period: 'Full year',
        use_trend: false,
        max_discount: 0.25,
        budget_multiplier: 1.0,
        unconstrained: false,
        alpha: null,
        margin_floor: 0.4,
        allocation_mode: 'actual',
        quarterly_splits: null,
      };
      mockGet.mockResolvedValue({ data: config });
      const result = await getScenarioConfig('scen-1');
      expect(mockGet).toHaveBeenCalledWith(`${PREFIX}/scenarios/scen-1/config`);
      expect(result).toEqual(config);
    });

    it('returns null when API returns null', async () => {
      mockGet.mockResolvedValue({ data: null });
      const result = await getScenarioConfig('scen-1');
      expect(result).toBeNull();
    });
  });

  describe('saveScenarioConfig', () => {
    it('calls PUT /scenarios/:id/config with payload', async () => {
      const payload: ApiSaveScenarioConfigPayload = {
        analysis_type: 'retro',
        selected_skus: ['HX9911/09'],
        objective: 'profit',
        year: 2024,
        plan_year: null,
        base_year: null,
        reference_year: 2023,
        economics: 'legacy',
        period: 'Full year',
        use_trend: false,
        max_discount: 0.25,
        budget_multiplier: 1.0,
        unconstrained: false,
        alpha: null,
        margin_floor: 0.4,
        allocation_mode: 'actual',
      };
      mockPut.mockResolvedValue({ data: {} });
      await saveScenarioConfig('scen-1', payload);
      expect(mockPut).toHaveBeenCalledWith(`${PREFIX}/scenarios/scen-1/config`, payload);
    });
  });

  describe('deleteScenarioConfig', () => {
    it('calls DELETE /scenarios/:id/config', async () => {
      mockDelete.mockResolvedValue({ data: undefined });
      await deleteScenarioConfig('scen-1');
      expect(mockDelete).toHaveBeenCalledWith(`${PREFIX}/scenarios/scen-1/config`);
    });
  });

  describe('runScenarioOptimize', () => {
    it('calls POST /scenarios/:id/optimize and returns response', async () => {
      const response: ApiScenarioOptimizeResponse = {
        scenario_id: 'scen-1',
        status: 'RUNNING',
        result: MOCK_SIMULATION_RESPONSE,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      mockPost.mockResolvedValue({ data: response });
      const result = await runScenarioOptimize('scen-1');
      expect(mockPost).toHaveBeenCalledWith(`${PREFIX}/scenarios/scen-1/optimize`);
      expect(result).toEqual(response);
    });
  });

  // ── Optimization result ──────────────────────────────────────────────────────

  describe('getOptimizationResult', () => {
    it('calls GET /scenarios/:id/optimization-result and returns result', async () => {
      const result: ApiOptimizationResult = {
        scenario_id: 'scen-1',
        result_json: MOCK_SIMULATION_RESPONSE,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      mockGet.mockResolvedValue({ data: result });
      const res = await getOptimizationResult('scen-1');
      expect(mockGet).toHaveBeenCalledWith(`${PREFIX}/scenarios/scen-1/optimization-result`);
      expect(res).toEqual(result);
    });
  });

  describe('saveOptimizationResult', () => {
    it('calls PUT /scenarios/:id/optimization-result with result_json', async () => {
      const resultData = { status: 'ok', objective: 'profit' };
      mockPut.mockResolvedValue({ data: {} });
      await saveOptimizationResult('scen-1', resultData);
      expect(mockPut).toHaveBeenCalledWith(`${PREFIX}/scenarios/scen-1/optimization-result`, {
        result_json: resultData,
      });
    });
  });

  describe('deleteOptimizationResult', () => {
    it('calls DELETE /scenarios/:id/optimization-result', async () => {
      mockDelete.mockResolvedValue({ data: undefined });
      await deleteOptimizationResult('scen-1');
      expect(mockDelete).toHaveBeenCalledWith(`${PREFIX}/scenarios/scen-1/optimization-result`);
    });
  });

  // ── SKU master ──────────────────────────────────────────────────────────────

  describe('syncSkuMaster', () => {
    it('calls POST /skus/sync and returns sync result', async () => {
      const response: ApiSkuSyncResponse = {
        source: 'api',
        inserted: 5,
        updated: 2,
        unchanged: 10,
        deactivated: 1,
        total_active: 16,
      };
      mockPost.mockResolvedValue({ data: response });
      const result = await syncSkuMaster();
      expect(mockPost).toHaveBeenCalledWith(`${PREFIX}/skus/sync`);
      expect(result).toEqual(response);
    });
  });

  describe('fetchSkuMaster', () => {
    it('calls GET /skus/master without params when no classification given', async () => {
      const response: ApiSkuMasterListResponse = { total: 0, skus: [] };
      mockGet.mockResolvedValue({ data: response });
      await fetchSkuMaster();
      expect(mockGet).toHaveBeenCalledWith(`${PREFIX}/skus/master`, { params: undefined });
    });

    it('calls GET /skus/master with classification param when provided', async () => {
      const response: ApiSkuMasterListResponse = { total: 0, skus: [] };
      mockGet.mockResolvedValue({ data: response });
      await fetchSkuMaster('HRTB');
      expect(mockGet).toHaveBeenCalledWith(`${PREFIX}/skus/master`, { params: { classification: 'HRTB' } });
    });
  });

  describe('getSkuMasterById', () => {
    it('calls GET /skus/master/:id and returns item', async () => {
      const item: ApiSkuMasterItem = {
        sku_id: 'uuid-1',
        sku_code: 'HX9911/09',
        sku_name: 'Oral-B',
        classification: 'HRTB',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      mockGet.mockResolvedValue({ data: item });
      const result = await getSkuMasterById('uuid-1');
      expect(mockGet).toHaveBeenCalledWith(`${PREFIX}/skus/master/uuid-1`);
      expect(result).toEqual(item);
    });
  });

  // ── Health ───────────────────────────────────────────────────────────────────

  describe('fetchCoreServiceHealth', () => {
    it('calls GET /health and returns data', async () => {
      mockGet.mockResolvedValue({ data: { status: 'ok' } });
      const result = await fetchCoreServiceHealth();
      expect(mockGet).toHaveBeenCalledWith(`${PREFIX}/health`);
      expect(result).toEqual({ status: 'ok' });
    });
  });
});

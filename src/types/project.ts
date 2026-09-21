import type { SimulationResponse } from './simulation';

// ── API response shapes ──────────────────────────────────────────────────────

export type ApiScenarioStatus = 'DRAFT' | 'COMPLETED' | 'FAILED' | 'RUNNING';

export interface ApiScenario {
  scenario_id: string;
  project_id: string;
  scenario_name: string;
  status: ApiScenarioStatus;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiProject {
  project_id: string;
  project_name: string;
  user_id: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  markets: string[];
  mags: string[];
  retailers: string[];
  description: string | null;
}

export interface ApiProjectsListResponse {
  total: number;
  projects: ApiProject[];
}

export interface ApiScenariosListResponse {
  total: number;
  scenarios: ApiScenario[];
}

export interface ApiCreateProjectPayload {
  user_id: string;
  project_name: string;
  markets: string[];
  mags: string[];
  retailers: string[];
  description: string;
}

export interface ApiUpdateProjectPayload {
  project_name?: string;
  markets?: string[] | null;
  mags?: string[];
  retailers?: string[] | null;
  description?: string;
}

export interface ApiScenarioConfig {
  scenario_id: string;
  analysis_type: 'retro' | 'plan';
  selected_skus: string[];
  created_at: string;
  updated_at: string;
  objective: string;
  year: number | null;
  plan_year: number | null;
  base_year: number | null;
  reference_year: number;
  economics?: 'tn' | 'legacy';
  period: string;
  use_trend: boolean;
  max_discount: number;
  budget_multiplier: number;
  unconstrained: boolean;
  alpha: number | null;
  margin_floor: number;
  allocation_mode: string;
  quarterly_splits: Record<string, number> | null;
}

export interface ApiSaveScenarioConfigPayload {
  analysis_type: 'retro' | 'plan';
  selected_skus: string[];
  objective: string;
  year: number | null;
  plan_year: number | null;
  base_year: number | null;
  reference_year: number;
  economics?: 'tn' | 'legacy';
  period: string;
  use_trend: boolean;
  max_discount: number;
  budget_multiplier: number;
  unconstrained: boolean;
  alpha: number | null;
  margin_floor: number;
  allocation_mode: string;
  quarterly_splits?: Record<string, number> | null;
}

export interface ApiOptimizationResult {
  scenario_id: string;
  result_json: SimulationResponse;
  created_at: string;
  updated_at: string;
}

export interface ApiScenarioOptimizeResponse {
  scenario_id: string;
  status: ApiScenarioStatus;
  result: SimulationResponse;
  created_at: string;
  updated_at: string;
}

export interface ApiDashboardScenario {
  scenario_id: string;
  scenario_name: string;
  status: string;
  is_deleted: boolean;
  has_config: boolean;
  has_optimization_result: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiDashboardProject {
  project_id: string;
  project_name: string;
  markets: string[];
  mags: string[];
  retailers: string[];
  description: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  total_scenarios: number;
  scenarios: ApiDashboardScenario[];
}

export interface ApiDashboardResponse {
  user_id?: string;
  total_projects: number;
  projects: ApiDashboardProject[];
}

export interface ApiSkuMasterItem {
  sku_id: string;
  sku_code: string;
  sku_name: string | null;
  classification: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiSkuMasterListResponse {
  total: number;
  skus: ApiSkuMasterItem[];
}

export interface ApiSkuSyncResponse {
  source: string;
  inserted: number;
  updated: number;
  unchanged: number;
  deactivated: number;
  total_active: number;
}

// ── FE-facing types (used in components / contexts) ─────────────────────────

export interface Scenario {
  id: string;
  name: string;
  status: ApiScenarioStatus;
  deleted: boolean;
  createdOn: string;
  updatedOn: string;
  hasConfig?: boolean;
  hasResult?: boolean;
}

export interface Project {
  id: string;
  name: string;
  market: string;
  mag: string;
  retailer: string;
  description: string;
  period?: string;
  createdOn: string;
  updatedOn: string;
  deleted: boolean;
  scenarios: Scenario[];
}

export interface CreateProjectPayload {
  name: string;
  market: string;
  mag: string;
  retailer: string;
  description: string;
}

// ── Mapper helpers ───────────────────────────────────────────────────────────

export function mapApiProjectToProject(api: ApiProject, scenarios: Scenario[] = []): Project {
  return {
    id: api.project_id,
    name: api.project_name,
    market: api.markets[0] ?? '',
    mag: api.mags[0] ?? '',
    retailer: api.retailers[0] ?? '',
    description: api.description ?? '',
    createdOn: new Date(api.created_at).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    }),
    updatedOn: new Date(api.updated_at).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    }),
    deleted: api.is_deleted,
    scenarios,
  };
}

export function mapApiScenarioToScenario(api: ApiScenario): Scenario {
  return {
    id: api.scenario_id,
    name: api.scenario_name,
    status: api.status,
    deleted: api.is_deleted,
    createdOn: new Date(api.created_at).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    }),
    updatedOn: new Date(api.updated_at).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    }),
  };
}

export function mapDashboardProjectToProject(api: ApiDashboardProject): Project {
  return {
    id: api.project_id,
    name: api.project_name,
    market: api.markets[0] ?? '',
    mag: api.mags[0] ?? '',
    retailer: api.retailers[0] ?? '',
    description: api.description ?? '',
    createdOn: new Date(api.created_at).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    }),
    updatedOn: new Date(api.updated_at).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    }),
    deleted: api.is_deleted,
    scenarios: api.scenarios.map((scenario) => ({
      id: scenario.scenario_id,
      name: scenario.scenario_name,
      status: scenario.status as ApiScenarioStatus,
      deleted: scenario.is_deleted,
      createdOn: new Date(scenario.created_at).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      }),
      updatedOn: new Date(scenario.updated_at).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      }),
      hasConfig: scenario.has_config,
      hasResult: scenario.has_optimization_result,
    })),
  };
}

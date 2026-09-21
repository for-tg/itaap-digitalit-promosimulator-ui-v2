import { describe, expect, it } from 'vitest';

import {
  mapApiProjectToProject,
  mapApiScenarioToScenario,
  mapDashboardProjectToProject,
  type ApiDashboardProject,
  type ApiProject,
  type ApiScenario,
} from '~/types/project';

const makeApiProject = (overrides: Partial<ApiProject> = {}): ApiProject => ({
  project_id: 'proj-1',
  project_name: 'Test Project',
  user_id: 'user-1',
  is_deleted: false,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-06-20T12:00:00Z',
  markets: ['CZ'],
  mags: ['RTB'],
  retailers: ['All'],
  description: 'A test project',
  ...overrides,
});

const makeApiScenario = (overrides: Partial<ApiScenario> = {}): ApiScenario => ({
  scenario_id: 'scen-1',
  project_id: 'proj-1',
  scenario_name: 'Scenario A',
  status: 'DRAFT',
  is_deleted: false,
  created_at: '2024-02-01T08:00:00Z',
  updated_at: '2024-07-01T09:00:00Z',
  ...overrides,
});

const makeApiDashboardProject = (
  overrides: Partial<ApiDashboardProject> = {},
): ApiDashboardProject => ({
  project_id: 'proj-dash-1',
  project_name: 'Dashboard Project',
  markets: ['CZ'],
  mags: ['RTB'],
  retailers: ['All'],
  description: 'Dashboard project description',
  is_deleted: false,
  created_at: '2024-03-10T07:00:00Z',
  updated_at: '2024-08-01T07:00:00Z',
  total_scenarios: 1,
  scenarios: [
    {
      scenario_id: 'scen-dash-1',
      scenario_name: 'Dash Scenario',
      status: 'COMPLETED',
      is_deleted: false,
      created_at: '2024-04-01T06:00:00Z',
      updated_at: '2024-09-01T06:00:00Z',
      has_config: true,
      has_optimization_result: true,
    },
  ],
  ...overrides,
});

describe('mapApiProjectToProject', () => {
  it('maps project_id to id', () => {
    const result = mapApiProjectToProject(makeApiProject());
    expect(result.id).toBe('proj-1');
  });

  it('maps project_name to name', () => {
    const result = mapApiProjectToProject(makeApiProject());
    expect(result.name).toBe('Test Project');
  });

  it('uses first market from markets array', () => {
    const result = mapApiProjectToProject(makeApiProject({ markets: ['US', 'CZ'] }));
    expect(result.market).toBe('US');
  });

  it('returns empty string when markets array is empty', () => {
    const result = mapApiProjectToProject(makeApiProject({ markets: [] }));
    expect(result.market).toBe('');
  });

  it('uses first mag from mags array', () => {
    const result = mapApiProjectToProject(makeApiProject({ mags: ['RTB', 'BH'] }));
    expect(result.mag).toBe('RTB');
  });

  it('uses first retailer from retailers array', () => {
    const result = mapApiProjectToProject(makeApiProject({ retailers: ['Amazon', 'All'] }));
    expect(result.retailer).toBe('Amazon');
  });

  it('maps description, defaulting null to empty string', () => {
    expect(mapApiProjectToProject(makeApiProject({ description: 'desc' })).description).toBe('desc');
    expect(mapApiProjectToProject(makeApiProject({ description: null })).description).toBe('');
  });

  it('maps is_deleted to deleted', () => {
    expect(mapApiProjectToProject(makeApiProject({ is_deleted: true })).deleted).toBe(true);
    expect(mapApiProjectToProject(makeApiProject({ is_deleted: false })).deleted).toBe(false);
  });

  it('formats createdOn as localised date string', () => {
    const result = mapApiProjectToProject(makeApiProject({ created_at: '2024-01-15T10:00:00Z' }));
    expect(result.createdOn).toMatch(/\d{2}\s\w{3}\s\d{4}/);
  });

  it('formats updatedOn as localised date string', () => {
    const result = mapApiProjectToProject(makeApiProject({ updated_at: '2024-06-20T12:00:00Z' }));
    expect(result.updatedOn).toMatch(/\d{2}\s\w{3}\s\d{4}/);
  });

  it('attaches provided scenarios', () => {
    const scenario = mapApiScenarioToScenario(makeApiScenario());
    const result = mapApiProjectToProject(makeApiProject(), [scenario]);
    expect(result.scenarios).toHaveLength(1);
    expect(result.scenarios[0].id).toBe('scen-1');
  });

  it('defaults scenarios to empty array when not provided', () => {
    const result = mapApiProjectToProject(makeApiProject());
    expect(result.scenarios).toEqual([]);
  });
});

describe('mapApiScenarioToScenario', () => {
  it('maps scenario_id to id', () => {
    expect(mapApiScenarioToScenario(makeApiScenario()).id).toBe('scen-1');
  });

  it('maps scenario_name to name', () => {
    expect(mapApiScenarioToScenario(makeApiScenario()).name).toBe('Scenario A');
  });

  it('maps status', () => {
    expect(mapApiScenarioToScenario(makeApiScenario({ status: 'COMPLETED' })).status).toBe('COMPLETED');
    expect(mapApiScenarioToScenario(makeApiScenario({ status: 'FAILED' })).status).toBe('FAILED');
    expect(mapApiScenarioToScenario(makeApiScenario({ status: 'RUNNING' })).status).toBe('RUNNING');
    expect(mapApiScenarioToScenario(makeApiScenario({ status: 'DRAFT' })).status).toBe('DRAFT');
  });

  it('maps is_deleted to deleted', () => {
    expect(mapApiScenarioToScenario(makeApiScenario({ is_deleted: true })).deleted).toBe(true);
    expect(mapApiScenarioToScenario(makeApiScenario({ is_deleted: false })).deleted).toBe(false);
  });

  it('formats createdOn as localised date string', () => {
    const result = mapApiScenarioToScenario(makeApiScenario());
    expect(result.createdOn).toMatch(/\d{2}\s\w{3}\s\d{4}/);
  });

  it('formats updatedOn as localised date string', () => {
    const result = mapApiScenarioToScenario(makeApiScenario());
    expect(result.updatedOn).toMatch(/\d{2}\s\w{3}\s\d{4}/);
  });
});

describe('mapDashboardProjectToProject', () => {
  it('maps project_id to id', () => {
    expect(mapDashboardProjectToProject(makeApiDashboardProject()).id).toBe('proj-dash-1');
  });

  it('maps project_name to name', () => {
    expect(mapDashboardProjectToProject(makeApiDashboardProject()).name).toBe('Dashboard Project');
  });

  it('maps nested scenarios with hasConfig and hasResult', () => {
    const result = mapDashboardProjectToProject(makeApiDashboardProject());
    expect(result.scenarios).toHaveLength(1);
    expect(result.scenarios[0].id).toBe('scen-dash-1');
    expect(result.scenarios[0].hasConfig).toBe(true);
    expect(result.scenarios[0].hasResult).toBe(true);
  });

  it('maps scenario status correctly', () => {
    const result = mapDashboardProjectToProject(makeApiDashboardProject());
    expect(result.scenarios[0].status).toBe('COMPLETED');
  });

  it('handles empty scenarios array', () => {
    const result = mapDashboardProjectToProject(
      makeApiDashboardProject({ scenarios: [], total_scenarios: 0 }),
    );
    expect(result.scenarios).toHaveLength(0);
  });

  it('maps is_deleted to deleted', () => {
    expect(mapDashboardProjectToProject(makeApiDashboardProject({ is_deleted: true })).deleted).toBe(true);
  });

  it('defaults description from null to empty string', () => {
    expect(mapDashboardProjectToProject(makeApiDashboardProject({ description: null })).description).toBe('');
  });
});

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  navigate: vi.fn(),
  reset: vi.fn(),
  toggleExpanded: vi.fn(),
  addScenario: vi.fn(),
  deleteProject: vi.fn(),
  restoreProject: vi.fn(),
  permanentlyDeleteProject: vi.fn(),
  deleteScenario: vi.fn(),
  permanentlyDeleteScenario: vi.fn(),
  restoreScenario: vi.fn(),
  renameScenario: vi.fn(),
  expandedIds: new Set<string>(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockState.navigate,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('~/contexts/ProjectsContext', () => ({
  useProjects: () => mockState,
}));

vi.mock('~/contexts/SimulatorContext', () => ({
  useSimulator: () => ({ reset: mockState.reset }),
}));

vi.mock('~/components/Dashboard/EditProjectModal', () => ({
  EditProjectModal: () => <div data-testid="edit-modal" />,
}));

import { ProjectRow } from '~/components/Dashboard/ProjectRow';
import type { Project } from '~/types/project';

const project: Project = {
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
      status: 'DRAFT',
      deleted: false,
      hasConfig: true,
      hasResult: true,
      createdOn: '01 Jan 2026',
      updatedOn: '02 Jan 2026',
    },
    {
      id: 'scen-2',
      name: 'Deleted Scenario',
      status: 'COMPLETED',
      deleted: true,
      hasConfig: false,
      hasResult: false,
      createdOn: '01 Jan 2026',
      updatedOn: '02 Jan 2026',
    },
  ],
};

afterEach(() => {
  cleanup();
  mockState.navigate.mockClear();
  mockState.reset.mockClear();
  mockState.toggleExpanded.mockClear();
  mockState.addScenario.mockClear();
  mockState.deleteProject.mockClear();
  mockState.restoreProject.mockClear();
  mockState.permanentlyDeleteProject.mockClear();
  mockState.deleteScenario.mockClear();
  mockState.permanentlyDeleteScenario.mockClear();
  mockState.restoreScenario.mockClear();
  mockState.renameScenario.mockClear();
  mockState.expandedIds = new Set<string>();
});

describe('ProjectRow', () => {
  it('opens scenarios, adds scenarios, and supports row actions', async () => {
    mockState.expandedIds = new Set(['proj-1']);
    mockState.addScenario.mockResolvedValue(undefined);
    mockState.renameScenario.mockResolvedValue(undefined);

    render(<table><tbody><ProjectRow project={project} viewMode="all" /></tbody></table>);

    fireEvent.click(screen.getByRole('button', { name: 'Scenario One' }));
    expect(mockState.reset).toHaveBeenCalled();
    expect(mockState.navigate).toHaveBeenCalledWith('/project/proj-1/scenario/scen-1', {
      state: { fromDashboardClick: true },
    });

    fireEvent.click(screen.getByTitle('home.projectRow.renameScenario'));
    const renameInput = screen.getAllByRole('textbox')[0];
    fireEvent.change(renameInput, { target: { value: 'Scenario Renamed' } });
    fireEvent.blur(renameInput);
    expect(mockState.renameScenario).toHaveBeenCalledWith('proj-1', 'scen-1', 'Scenario Renamed');

    fireEvent.click(screen.getByTitle('home.projectRow.deleteScenario'));
    expect(mockState.deleteScenario).toHaveBeenCalledWith('proj-1', 'scen-1');

    fireEvent.click(screen.getByTitle('home.projectRow.deleteProject'));
    expect(mockState.deleteProject).toHaveBeenCalledWith('proj-1');

    const addInput = screen.getByPlaceholderText('home.newScenarioName');
    fireEvent.change(addInput, { target: { value: 'Scenario Two' } });
    fireEvent.click(screen.getByRole('button', { name: 'metrics.add' }));
    expect(mockState.addScenario).toHaveBeenCalledWith('proj-1', 'Scenario Two');
  });

  it('renders deleted project actions and deleted scenario controls', async () => {
    const user = userEvent.setup();
    mockState.expandedIds = new Set(['proj-1']);

    render(<table><tbody><ProjectRow project={{ ...project, deleted: true }} viewMode="deleted" /></tbody></table>);

    await user.click(screen.getByTitle('home.projectRow.restoreProject'));
    expect(mockState.restoreProject).toHaveBeenCalledWith('proj-1');

    await user.click(screen.getByTitle('home.projectRow.deleteProjectPermanently'));
    expect(mockState.permanentlyDeleteProject).toHaveBeenCalledWith('proj-1');

    expect(screen.getByRole('button', { name: 'Deleted Scenario' })).toBeDisabled();
  });

  it('renders deleted view for active project and supports restore-only scenario action', async () => {
    const user = userEvent.setup();
    mockState.expandedIds = new Set(['proj-1']);

    render(<table><tbody><ProjectRow project={project} viewMode="deleted" /></tbody></table>);

    await user.click(screen.getByText('Project One'));
    expect(mockState.toggleExpanded).toHaveBeenCalledWith('proj-1', false);

    // In deleted view for active project, project-level actions are not available.
    expect(screen.queryByTitle('home.projectRow.editProject')).not.toBeInTheDocument();
    expect(screen.queryByTitle('home.projectRow.deleteProject')).not.toBeInTheDocument();

    await user.click(screen.getByTitle('home.projectRow.restoreScenario'));
    expect(mockState.restoreScenario).toHaveBeenCalledWith('proj-1', 'scen-2');
  });

  it('supports edit modal, rename escape, and Enter add-scenario paths', async () => {
    const user = userEvent.setup();
    mockState.expandedIds = new Set(['proj-1']);
    mockState.addScenario.mockResolvedValue(undefined);

    render(<table><tbody><ProjectRow project={project} viewMode="all" /></tbody></table>);

    await user.click(screen.getByTitle('home.projectRow.editProject'));
    expect(screen.getByTestId('edit-modal')).toBeInTheDocument();

    await user.click(screen.getByTitle('home.projectRow.renameScenario'));
    const renameInput = screen.getAllByRole('textbox')[0];
    fireEvent.change(renameInput, { target: { value: '   ' } });
    fireEvent.keyDown(renameInput, { key: 'Enter' });
    expect(mockState.renameScenario).not.toHaveBeenCalled();

    await user.click(screen.getByTitle('home.projectRow.renameScenario'));
    const renameInputAgain = screen.getAllByRole('textbox')[0];
    fireEvent.change(renameInputAgain, { target: { value: 'Will cancel' } });
    fireEvent.keyDown(renameInputAgain, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Scenario One' })).toBeInTheDocument();

    const addInput = screen.getByPlaceholderText('home.newScenarioName');
    fireEvent.change(addInput, { target: { value: '   ' } });
    fireEvent.keyDown(addInput, { key: 'Enter' });
    expect(mockState.addScenario).not.toHaveBeenCalled();

    fireEvent.change(addInput, { target: { value: 'Scenario Enter' } });
    fireEvent.keyDown(addInput, { key: 'Enter' });
    expect(mockState.addScenario).toHaveBeenCalledWith('proj-1', 'Scenario Enter');
  });
});
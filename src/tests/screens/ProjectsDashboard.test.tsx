import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MyAccessResponse } from '~/types/rbac';

const mockState = vi.hoisted(() => ({
  navigate: vi.fn(),
  toggleTheme: vi.fn(),
  logoutRedirect: vi.fn(),
  activeAccount: {
    name: 'Jane Admin',
    username: 'jane@example.com',
  },
  isAdmin: true,
  enableSso: false,
  loadScenariosForProject: vi.fn(() => Promise.resolve()),
  loadDeletedScenariosForProject: vi.fn(() => Promise.resolve()),
  projects: {
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
      scenarios: unknown[];
    }> ,
    isLoading: false,
    error: null as string | null,
    toast: null as null | { message: string; type: 'success' | 'error' },
    loadScenariosForProject: vi.fn(() => Promise.resolve()),
    loadDeletedScenariosForProject: vi.fn(() => Promise.resolve()),
  },
}));

const makeProjectsState = (overrides: {
  projects: Array<{
    id: string;
    name: string;
    market: string;
    mag: string;
    retailer: string;
    period: string;
    createdOn: string;
    updatedOn: string;
    deleted: boolean;
    scenarios: unknown[];
  }>;
  isLoading: boolean;
  error: string | null;
  toast: null | { message: string; type: 'success' | 'error' };
}) => ({
  ...overrides,
  loadScenariosForProject: mockState.loadScenariosForProject,
  loadDeletedScenariosForProject: mockState.loadDeletedScenariosForProject,
});

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockState.navigate,
}));

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    instance: {
      getActiveAccount: () => mockState.activeAccount,
      logoutRedirect: mockState.logoutRedirect,
    },
    accounts: [mockState.activeAccount],
  }),
}));

vi.mock('~/contexts/ProjectsContext', () => ({
  useProjects: () => mockState.projects,
}));

vi.mock('~/contexts/ThemeContext', () => ({
  useTheme: () => ({ toggleTheme: mockState.toggleTheme }),
}));

vi.mock('~/components/Dashboard/CreateProjectModal', () => ({
  CreateProjectModal: () => <div data-testid="create-modal" />,
}));

vi.mock('~/components/Dashboard/ProjectRow', () => ({
  ProjectRow: ({ project }: { project: { name: string } }) => <tr><td>{project.name}</td></tr>,
}));

vi.mock('~/components/Layout/LanguageSelector', () => ({
  LanguageSelector: () => <div data-testid="language-selector" />,
}));

vi.mock('~/utils/appConfig', () => ({
  appConfigs: {
    get ENABLE_SSO() {
      return mockState.enableSso;
    },
  },
}));

vi.mock('~/utils/authRoles', () => ({
  hasAdminRole: () => mockState.isAdmin,
}));

vi.mock('~/services/rbacService', () => ({
  fetchMyAccess: vi.fn(),
}));

import { ProjectsDashboard } from '~/screens/ProjectsDashboard';
import { fetchMyAccess } from '~/services/rbacService';

const myAccessEmpty: MyAccessResponse = {
  user: { id: 'u1', email: 'jane@example.com', role: 'user' },
  access: { regions: [] },
};

const myAccessWithRequest: MyAccessResponse = {
  user: { id: 'u1', email: 'jane@example.com', role: 'user' },
  access: {
    regions: [
      {
        regionId: 1,
        regionName: 'EMEA',
        countries: [
          {
            countryCode: 'CZ',
            countryName: 'Czech Republic',
            mags: [
              {
                magName: 'RTB',
                retailers: [{ name: 'All', status: 'pending' }],
              },
            ],
          },
        ],
      },
    ],
  },
};

const makeProject = (name: string, deleted = false) => ({
  id: name,
  name,
  market: 'CZ',
  mag: 'RTB',
  retailer: 'All',
  period: 'Full year',
  createdOn: '01 Jan 2026',
  updatedOn: '02 Jan 2026',
  deleted,
  scenarios: [],
});

afterEach(() => {
  cleanup();
  mockState.navigate.mockClear();
  mockState.toggleTheme.mockClear();
  mockState.logoutRedirect.mockClear();
  mockState.isAdmin = true;
  mockState.enableSso = false;
  mockState.loadScenariosForProject.mockClear();
  mockState.loadDeletedScenariosForProject.mockClear();
  vi.mocked(fetchMyAccess).mockReset();
});

describe('ProjectsDashboard', () => {
  it('renders loading, empty, and project table states', async () => {
    const user = userEvent.setup();
    mockState.projects = makeProjectsState({ projects: [], isLoading: true, error: null, toast: null });

    const { rerender } = render(<ProjectsDashboard />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    mockState.projects = makeProjectsState({ projects: [], isLoading: false, error: null, toast: null });
    rerender(<ProjectsDashboard />);
    expect(screen.getByText(/home\.createYourFirstProject/i)).toBeInTheDocument();

    mockState.projects = makeProjectsState({ projects: [makeProject('Project One')], isLoading: false, error: null, toast: null });
    rerender(<ProjectsDashboard />);
    expect(screen.getByText('Project One')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /home\.createNewProject/i }));
    expect(screen.getByTestId('create-modal')).toBeInTheDocument();
  });

  it('navigates to admin access and toggles theme', async () => {
    const user = userEvent.setup();
    mockState.projects = makeProjectsState({ projects: [makeProject('Project One')], isLoading: false, error: null, toast: null });

    render(<ProjectsDashboard />);

    await user.click(screen.getByRole('button', { name: /admin/i }));
    expect(mockState.navigate).toHaveBeenCalledWith('/admin/access');

    await user.click(screen.getByRole('button', { name: /home\.theme/i }));
    expect(mockState.toggleTheme).toHaveBeenCalled();
  });

  it('shows deleted tab and toast', async () => {
    const user = userEvent.setup();
    mockState.projects = makeProjectsState({
      projects: [makeProject('Project One'), makeProject('Project Two', true)],
      isLoading: false,
      error: null,
      toast: { message: 'Saved', type: 'success' },
    });

    render(<ProjectsDashboard />);

    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    await user.click(screen.getByRole('button', { name: /home\.tabs\.deletedItems/i }));
    expect(screen.getByText('Project Two')).toBeInTheDocument();
  });

  it('routes non-admin users to access page and supports SSO sign out', async () => {
    const user = userEvent.setup();
    mockState.isAdmin = false;
    mockState.enableSso = true;
    vi.mocked(fetchMyAccess).mockResolvedValueOnce(myAccessEmpty);
    mockState.projects = makeProjectsState({ projects: [makeProject('Project One')], isLoading: false, error: null, toast: null });

    render(<ProjectsDashboard />);

    await user.click(screen.getByRole('button', { name: 'app.regionAccess' }));
    expect(mockState.navigate).toHaveBeenCalledWith('/access');

    await user.click(screen.getByRole('button', { name: /common\.signOut/i }));
    expect(mockState.logoutRedirect).toHaveBeenCalled();
  });

  it('shows view access label for non-admin users with request history', async () => {
    const user = userEvent.setup();
    mockState.isAdmin = false;
    vi.mocked(fetchMyAccess).mockResolvedValueOnce(myAccessWithRequest);
    mockState.projects = makeProjectsState({ projects: [makeProject('Project One')], isLoading: false, error: null, toast: null });

    render(<ProjectsDashboard />);

    await user.click(await screen.findByRole('button', { name: 'access.request.viewRequest' }));
    expect(mockState.navigate).toHaveBeenCalledWith('/access');
  });

  it('shows deleted empty state and error state', async () => {
    const user = userEvent.setup();
    mockState.projects = makeProjectsState({ projects: [], isLoading: false, error: null, toast: null });

    const { rerender } = render(<ProjectsDashboard />);
    await user.click(screen.getByRole('button', { name: /home\.tabs\.deletedItems/i }));
    expect(screen.getByText(/home\.noDeletedItems/i)).toBeInTheDocument();

    mockState.projects = makeProjectsState({ projects: [], isLoading: false, error: 'boom', toast: null });
    rerender(<ProjectsDashboard />);
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('does not prefetch deleted scenarios on deleted tab switch', async () => {
    const user = userEvent.setup();
    mockState.projects = makeProjectsState({
      projects: [makeProject('Project One'), makeProject('Project Two')],
      isLoading: false,
      error: null,
      toast: null,
    });

    const { rerender } = render(<ProjectsDashboard />);

    await user.click(screen.getByRole('button', { name: /home\.tabs\.deletedItems/i }));
    expect(mockState.loadDeletedScenariosForProject).not.toHaveBeenCalled();

    rerender(<ProjectsDashboard />);
    expect(mockState.loadDeletedScenariosForProject).not.toHaveBeenCalled();
  });

  it('keeps non-admin access button on fetchMyAccess failure', async () => {
    mockState.isAdmin = false;
    vi.mocked(fetchMyAccess).mockRejectedValueOnce(new Error('boom'));
    mockState.projects = makeProjectsState({ projects: [makeProject('Project One')], isLoading: false, error: null, toast: null });

    render(<ProjectsDashboard />);

    expect(await screen.findByRole('button', { name: 'app.regionAccess' })).toBeInTheDocument();
  });
});
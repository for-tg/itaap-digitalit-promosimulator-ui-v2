import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MyAccessResponse } from '~/types/rbac';

const mockState = vi.hoisted(() => ({
  navigate: vi.fn(),
  toggleTheme: vi.fn(),
  logoutRedirect: vi.fn().mockResolvedValue(undefined),
  activeAccount: {
    name: 'Jane Admin',
    username: 'jane@example.com',
    idTokenClaims: { roles: ['ADMIN'] },
  },
  enableSso: false,
  isAdmin: true,
}));

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

vi.mock('~/contexts/ThemeContext', () => ({
  useTheme: () => ({ toggleTheme: mockState.toggleTheme }),
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

import { TopBar } from '~/components/Layout/TopBar';
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

afterEach(() => {
  cleanup();
  mockState.navigate.mockClear();
  mockState.toggleTheme.mockClear();
  mockState.logoutRedirect.mockClear();
  mockState.enableSso = false;
  mockState.isAdmin = true;
  vi.mocked(fetchMyAccess).mockReset();
});

describe('TopBar', () => {
  it('renders project context and navigates home', async () => {
    const user = userEvent.setup();

    render(
      <TopBar
        activeProject={{
          id: 'proj-1',
          name: 'Project One',
          market: 'CZ',
          mag: 'RTB',
          retailer: 'All',
          createdOn: '01 Jan 2026',
          updatedOn: '02 Jan 2026',
          deleted: false,
          scenarios: [],
          description: '',
          period: 'Full year',
        }}
        activeScenario={{
          id: 'scen-1',
          name: 'Scenario One',
          status: 'DRAFT',
          deleted: false,
          hasConfig: false,
          hasResult: false,
          createdOn: '01 Jan 2026',
          updatedOn: '02 Jan 2026',
        }}
      />,
    );

    expect(screen.getByLabelText('app.activeProjectContext')).toBeInTheDocument();
    expect(screen.getByText('Scenario One')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'app.admin' }));
    expect(mockState.navigate).toHaveBeenCalledWith('/admin/access');

    await user.click(screen.getByRole('button', { name: 'app.toggleColourTheme' }));
    expect(mockState.toggleTheme).toHaveBeenCalled();
  });

  it('logs out through MSAL when SSO is enabled', async () => {
    const user = userEvent.setup();
    mockState.enableSso = true;

    render(<TopBar activeProject={null} activeScenario={null} />);

    await user.click(screen.getByRole('button', { name: 'common.signOut' }));
    expect(mockState.logoutRedirect).toHaveBeenCalled();
  });

  it('navigates to access when user is not admin and handles non-SSO signout', async () => {
    const user = userEvent.setup();
    mockState.isAdmin = false;
    mockState.enableSso = false;
    vi.mocked(fetchMyAccess).mockResolvedValueOnce(myAccessEmpty);

    render(<TopBar activeProject={null} activeScenario={null} />);

    await user.click(screen.getByRole('button', { name: 'app.regionAccess' }));
    expect(mockState.navigate).toHaveBeenCalledWith('/access');

    await user.click(screen.getByRole('button', { name: 'common.signOut' }));
    expect(mockState.navigate).toHaveBeenCalledWith('/');
  });

  it('shows view access label when user already has request history', async () => {
    const user = userEvent.setup();
    mockState.isAdmin = false;
    vi.mocked(fetchMyAccess).mockResolvedValueOnce(myAccessWithRequest);

    render(<TopBar activeProject={null} activeScenario={null} />);

    await user.click(await screen.findByRole('button', { name: 'access.request.viewRequest' }));
    expect(mockState.navigate).toHaveBeenCalledWith('/access');
  });

  it('supports keyboard Enter on logo and logs logout errors', async () => {
    const user = userEvent.setup();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockState.enableSso = true;
    mockState.logoutRedirect.mockRejectedValueOnce(new Error('logout-failed'));

    render(<TopBar activeProject={null} activeScenario={null} />);

    const homeTarget = screen.getByRole('button', { name: 'app.rgmAndPhcat' });
    homeTarget.focus();
    await user.keyboard('{Enter}');

    expect(mockState.navigate).toHaveBeenCalledWith('/');

    await user.click(screen.getByRole('button', { name: 'common.signOut' }));
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});

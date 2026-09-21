import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessOptionsRegion, MyAccessResponse } from '~/types/rbac';

const mockState = vi.hoisted(() => ({
  navigate: vi.fn(),
  toggleTheme: vi.fn(),
  logoutRedirect: vi.fn(),
  activeAccount: {
    name: 'Jane User',
    username: 'jane@example.com',
  },
  isAdmin: true,
  enableSso: true,
  fetchAccessOptions: vi.fn(),
  fetchMyAccess: vi.fn(),
  createAccessRequest: vi.fn(),
  getRbacErrorMessage: vi.fn((_: unknown, fallback: string) => fallback),
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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('~/components/Layout/LanguageSelector', () => ({
  LanguageSelector: () => <div data-testid="language-selector" />,
}));

vi.mock('~/contexts/ThemeContext', () => ({
  useTheme: () => ({ toggleTheme: mockState.toggleTheme }),
}));

vi.mock('~/utils/authRoles', () => ({
  hasAdminRole: () => mockState.isAdmin,
}));

vi.mock('~/utils/appConfig', () => ({
  appConfigs: {
    get ENABLE_SSO() {
      return mockState.enableSso;
    },
  },
}));

vi.mock('~/services/rbacService', () => ({
  fetchAccessOptions: mockState.fetchAccessOptions,
  fetchMyAccess: mockState.fetchMyAccess,
  createAccessRequest: mockState.createAccessRequest,
  getRbacErrorMessage: mockState.getRbacErrorMessage,
}));

import { AccessScreen } from '~/screens/AccessScreen';

const accessOptions: AccessOptionsRegion[] = [
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
            retailers: [
              { retailerName: 'Amazon' },
              { retailerName: 'Costco' },
              { retailerName: 'Target' },
            ],
          },
        ],
      },
    ],
  },
];

const myAccessEmpty: MyAccessResponse = {
  user: {
    id: 'u1',
    email: 'jane@example.com',
    role: 'user',
  },
  access: {
    regions: [],
  },
};

const myAccessWithStatuses: MyAccessResponse = {
  user: {
    id: 'u1',
    email: 'jane@example.com',
    role: 'user',
  },
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
                retailers: [
                  { name: 'Amazon', status: 'pending' },
                  { name: 'Costco', status: 'approved' },
                  { name: 'Target', status: 'rejected' },
                ],
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
});

describe('AccessScreen', () => {
  beforeEach(() => {
    mockState.navigate.mockReset();
    mockState.toggleTheme.mockReset();
    mockState.logoutRedirect.mockReset();
    mockState.fetchAccessOptions.mockReset();
    mockState.fetchMyAccess.mockReset();
    mockState.createAccessRequest.mockReset();
    mockState.getRbacErrorMessage.mockClear();

    mockState.isAdmin = true;
    mockState.enableSso = true;
    mockState.fetchAccessOptions.mockResolvedValue(accessOptions);
    mockState.fetchMyAccess.mockResolvedValue(myAccessEmpty);
  });

  it('loads landing view and supports topbar actions', async () => {
    const user = userEvent.setup();

    render(<AccessScreen />);

    expect(await screen.findByText('access.page.accessRequired')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'access.page.home' }));
    expect(mockState.navigate).toHaveBeenCalledWith('/');

    await user.click(screen.getByRole('button', { name: 'app.admin' }));
    expect(mockState.navigate).toHaveBeenCalledWith('/admin/access');

    await user.click(screen.getByRole('button', { name: /home\.theme/i }));
    expect(mockState.toggleTheme).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'common.signOut' }));
    expect(mockState.logoutRedirect).toHaveBeenCalledTimes(1);
  }, 15000);

  it('switches from landing to request table when view-request action is clicked', async () => {
    const user = userEvent.setup();
    const withPending: MyAccessResponse = {
      ...myAccessWithStatuses,
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
                    retailers: [{ name: 'Amazon', status: 'pending' }],
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    mockState.fetchMyAccess.mockResolvedValue(withPending);

    render(<AccessScreen />);

    await user.click(await screen.findByRole('button', { name: 'access.request.viewRequest' }));
    expect(await screen.findByText('access.page.accessRequests')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('hides quick request action when user already has approved access', async () => {
    const withApproved: MyAccessResponse = {
      ...myAccessWithStatuses,
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
                    retailers: [{ name: 'Costco', status: 'approved' }],
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    mockState.fetchMyAccess.mockResolvedValue(withApproved);

    render(<AccessScreen />);

    expect(await screen.findByText('access.page.accessRequests')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'access.request.viewRequest' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'access.request.requestAccess' })).not.toBeInTheDocument();
  });

  it('shows request history mode and opens modal from requests view', async () => {
    const user = userEvent.setup();
    mockState.fetchMyAccess.mockResolvedValue(myAccessWithStatuses);

    render(<AccessScreen />);

    expect(await screen.findByText('access.page.accessRequests')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'access.request.otherAccess' }));
    expect(await screen.findByRole('button', { name: 'actions.close' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'actions.close' }));
    expect(screen.queryByRole('button', { name: 'actions.close' })).not.toBeInTheDocument();
  });

  it('shows load error and recovers on retry', async () => {
    const user = userEvent.setup();
    let shouldFail = true;
    mockState.fetchAccessOptions.mockImplementation(async () => {
      if (shouldFail) throw new Error('load failed');
      return accessOptions;
    });
    mockState.fetchMyAccess.mockImplementation(async () => {
      if (shouldFail) throw new Error('load failed');
      return myAccessEmpty;
    });

    render(<AccessScreen />);

    expect(await screen.findByRole('button', { name: 'access.page.retry' })).toBeInTheDocument();
    shouldFail = false;
    await user.click(screen.getByRole('button', { name: 'access.page.retry' }));
    expect(await screen.findByText('access.page.accessRequired')).toBeInTheDocument();
  });

  it('hides signout when SSO is disabled and closes modal via close button', async () => {
    const user = userEvent.setup();
    mockState.enableSso = false;

    render(<AccessScreen />);

    expect(await screen.findByText('access.page.accessRequired')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'common.signOut' })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'access.request.requestAccess' })[0]);
    await user.click(screen.getByRole('button', { name: 'actions.close' }));

    expect(screen.queryByRole('button', { name: 'actions.close' })).not.toBeInTheDocument();
  });

  // it('opens modal, submits request, and shows success toast', async () => {
  //   const user = userEvent.setup();
  //   mockState.fetchMyAccess
  //     .mockResolvedValueOnce(myAccessEmpty)
  //     .mockResolvedValueOnce({
  //       ...myAccessEmpty,
  //       access: {
  //         regions: [
  //           {
  //             regionId: 1,
  //             regionName: 'EMEA',
  //             countries: [
  //               {
  //                 countryCode: 'CZ',
  //                 countryName: 'Czech Republic',
  //                 mags: [
  //                   {
  //                     magName: 'RTB',
  //                     retailers: [{ name: 'All', status: 'pending' }],
  //                   },
  //                 ],
  //               },
  //             ],
  //           },
  //         ],
  //       },
  //     });
  //   mockState.createAccessRequest.mockResolvedValue({ message: 'ok', access: [] });

  //   render(<AccessScreen />);

  //   const main = await screen.findByRole('main');
  //   await user.click(
  //     within(main).getByRole('button', {
  //       name: /access\.request\.(requestAccess|otherAccess)/i,
  //     }),
  //   );

  //   await user.click(await screen.findByRole('button', { name: /access\.form\.selectRegion/i }));
  //   await user.click(screen.getByRole('button', { name: /EMEA/ }));

  //   await user.click(screen.getByRole('button', { name: /access\.form\.selectCountry/i }));
  //   await user.click(screen.getByRole('button', { name: /Czech Republic/ }));

  //   await user.click(screen.getByRole('button', { name: /access\.form\.selectMag/i }));
  //   await user.click(screen.getByRole('button', { name: /RTB/ }));

  //   await user.click(screen.getByRole('button', { name: /access\.form\.selectRetailer/i }));
  //   await user.click(screen.getByRole('button', { name: /All/ }));

  //   await user.click(screen.getByRole('button', { name: 'access.request.submitRequest' }));

  //   await waitFor(() => {
  //     expect(mockState.createAccessRequest).toHaveBeenCalledWith({
  //       regionName: 'EMEA',
  //       countryCode: 'CZ',
  //       magName: 'RTB',
  //       retailers: ['All'],
  //     });
  //   });

  //   expect(await screen.findByText(/access.request.submitSuccess/)).toBeInTheDocument();
  // });
});

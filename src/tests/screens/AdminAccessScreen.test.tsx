import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminAccessRequest } from '~/types/rbac';

const mockState = vi.hoisted(() => ({
  navigate: vi.fn(),
  toggleTheme: vi.fn(),
  logoutRedirect: vi.fn(),
  activeAccount: {
    name: 'Jane Admin',
    username: 'jane.admin@example.com',
  },
  isAdmin: true,
  enableSso: false,
  fetchAdminRequests: vi.fn(),
  approveAccessRequest: vi.fn(),
  rejectAccessRequest: vi.fn(),
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
  fetchAdminRequests: mockState.fetchAdminRequests,
  approveAccessRequest: mockState.approveAccessRequest,
  rejectAccessRequest: mockState.rejectAccessRequest,
  getRbacErrorMessage: mockState.getRbacErrorMessage,
}));

import { AdminAccessScreen } from '~/screens/AdminAccessScreen';

const pendingRow: AdminAccessRequest = {
  accessId: 101,
  userId: 'u1',
  email: 'user@example.com',
  role: 'user',
  regionName: 'EMEA',
  countryCode: 'CZ',
  countryName: 'Czech Republic',
  magName: 'RTB',
  retailerName: 'All',
  status: 'pending',
  requestedOn: '2026-08-20T10:00:00Z',
  approvedBy: null,
  approvedOn: null,
};

afterEach(() => {
  cleanup();
});

describe('AdminAccessScreen', () => {
  beforeEach(() => {
    mockState.navigate.mockReset();
    mockState.toggleTheme.mockReset();
    mockState.logoutRedirect.mockReset();
    mockState.fetchAdminRequests.mockReset();
    mockState.approveAccessRequest.mockReset();
    mockState.rejectAccessRequest.mockReset();
    mockState.getRbacErrorMessage.mockClear();

    mockState.isAdmin = true;
    mockState.enableSso = false;

    mockState.fetchAdminRequests.mockImplementation(async (status: string) => {
      if (status === 'pending') return [pendingRow];
      return [];
    });
  });

  it('shows access denied state for non-admin users', async () => {
    const user = userEvent.setup();
    mockState.isAdmin = false;

    render(<AdminAccessScreen />);

    expect(screen.getByText('access.admin.accessDenied')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'access.admin.backToHome' }));
    expect(mockState.navigate).toHaveBeenCalledWith('/');
  });

  it('loads pending requests and handles approve action', async () => {
    const user = userEvent.setup();
    mockState.approveAccessRequest.mockResolvedValue(undefined);

    render(<AdminAccessScreen />);

    expect(await screen.findByText('user@example.com')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'access.admin.approve' }));

    await waitFor(() => {
      expect(mockState.approveAccessRequest).toHaveBeenCalledWith(101);
    });

    expect(await screen.findByText(/access.admin.requestApproved/)).toBeInTheDocument();
  });

  it('handles reject action and shows success toast', async () => {
    const user = userEvent.setup();
    mockState.rejectAccessRequest.mockResolvedValue(undefined);

    render(<AdminAccessScreen />);

    expect(await screen.findByText('user@example.com')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'access.admin.reject' }));

    await waitFor(() => {
      expect(mockState.rejectAccessRequest).toHaveBeenCalledWith(101);
    });

    expect(await screen.findByText(/access.admin.requestRejected/)).toBeInTheDocument();
  });

  it('shows load error and retries data fetch', async () => {
    const user = userEvent.setup();
    let shouldFail = true;
    mockState.fetchAdminRequests.mockImplementation(async (status: string) => {
      if (shouldFail) {
        throw new Error('load failed');
      }
      if (status === 'pending') return [pendingRow];
      return [];
    });

    render(<AdminAccessScreen />);

    expect(await screen.findByRole('button', { name: 'access.page.retry' })).toBeInTheDocument();
    shouldFail = false;
    await user.click(screen.getByRole('button', { name: 'access.page.retry' }));

    expect(await screen.findByText('user@example.com')).toBeInTheDocument();
  });

  it('shows error toast when approve or reject fails', async () => {
    const user = userEvent.setup();
    mockState.approveAccessRequest.mockRejectedValueOnce(new Error('approve failed'));
    mockState.rejectAccessRequest.mockRejectedValueOnce(new Error('reject failed'));

    render(<AdminAccessScreen />);

    expect(await screen.findByText('user@example.com')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'access.admin.approve' }));
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('access.admin.approveFailed');
    });

    await user.click(screen.getByRole('button', { name: 'access.admin.reject' }));
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('access.admin.rejectFailed');
    });
  });

  it('renders approved and rejected tabs with empty and populated states', async () => {
    const user = userEvent.setup();
    const approvedRow: AdminAccessRequest = {
      ...pendingRow,
      accessId: 102,
      status: 'approved',
      countryName: '',
      countryCode: 'US',
      approvedBy: null,
      approvedOn: 'invalid-date',
    };
    const rejectedRow: AdminAccessRequest = {
      ...pendingRow,
      accessId: 103,
      status: 'rejected',
      email: 'rej@example.com',
      requestedOn: undefined as unknown as string,
    };

    mockState.fetchAdminRequests.mockImplementation(async (status: string) => {
      if (status === 'pending') return [];
      if (status === 'approved') return [approvedRow];
      return [rejectedRow];
    });

    render(<AdminAccessScreen />);

    expect(await screen.findByText('access.admin.noPendingRequests')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'access.admin.approvedRequests' }));
    expect(await screen.findByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('US')).toBeInTheDocument();
    expect(screen.getByText('invalid-date')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'access.admin.rejectedRequests' }));
    expect(await screen.findByText('rej@example.com')).toBeInTheDocument();
  });

  it('supports topbar actions and signout when SSO is enabled', async () => {
    const user = userEvent.setup();
    mockState.enableSso = true;

    render(<AdminAccessScreen />);

    expect(await screen.findByText('user@example.com')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'access.page.home' }));
    expect(mockState.navigate).toHaveBeenCalledWith('/');

    await user.click(screen.getByRole('button', { name: /home\.theme/i }));
    expect(mockState.toggleTheme).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'common.signOut' }));
    expect(mockState.logoutRedirect).toHaveBeenCalledTimes(1);
  });
});

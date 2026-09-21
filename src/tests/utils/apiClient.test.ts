import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock is hoisted before imports — static imports below will see the mocked modules.
const mockState = vi.hoisted(() => ({
  acquireTokenSilent: vi.fn(),
  getActiveAccount: vi.fn(),
}));

vi.mock('~/utils/appConfig', () => ({
  appConfigs: {
    API_BASE_URL: 'http://test-api.example.com',
    ENABLE_SSO: false,
    MSAL_CLIENT_ID: 'test-client-id',
    MSAL_AUTHORITY: 'https://login.microsoftonline.com/test-tenant',
    MSAL_SCOPE: 'api://test-scope/User.Read',
    MSAL_REDIRECT_URI: 'http://localhost:3000',
  },
}));

vi.mock('~/utils/msalConfig', () => ({
  msalInstance: {
    getActiveAccount: mockState.getActiveAccount,
    acquireTokenSilent: mockState.acquireTokenSilent,
  },
  loginRequest: { scopes: ['api://test-scope/User.Read'] },
}));

// Static imports — mocks above are applied before these resolve.
import { appConfigs } from '~/utils/appConfig';
import { axiosInstance, isAPIError } from '~/utils/apiClient';

// Helper: retrieves the first request interceptor handler registered by apiClient.
const getInterceptorHandler = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlers = (axiosInstance.interceptors.request as any).handlers as Array<{
    fulfilled: (cfg: object) => Promise<object>;
    rejected: (err: unknown) => Promise<unknown>;
  }>;
  return handlers[0];
};

describe('apiClient', () => {
  describe('axiosInstance', () => {
    it('is created with the correct baseURL from appConfigs', () => {
      expect(axiosInstance.defaults.baseURL).toBe('http://test-api.example.com');
    });

    it('exports isAPIError helper', () => {
      expect(typeof isAPIError).toBe('function');
    });

    it('isAPIError returns false for a plain Error', () => {
      expect(isAPIError(new Error('plain error'))).toBe(false);
    });

    it('isAPIError returns false for null', () => {
      expect(isAPIError(null)).toBe(false);
    });

    it('has request interceptors registered', () => {
      expect(axiosInstance.interceptors.request).toBeDefined();
    });
  });

  describe('request interceptor — SSO disabled', () => {
    it('passes config through without adding Authorization when ENABLE_SSO is false', async () => {
      const handler = getInterceptorHandler();
      expect(handler).toBeDefined();

      const config = { headers: {} };
      const result = await handler.fulfilled(config);
      expect(result).toBe(config);
      expect((result as Record<string, unknown>).headers).not.toHaveProperty('Authorization');
    });
  });

  describe('request interceptor — SSO enabled', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Mutate the mocked appConfigs object to enable SSO for these tests.
      (appConfigs as Record<string, unknown>).ENABLE_SSO = true;
    });

    afterEach(() => {
      (appConfigs as Record<string, unknown>).ENABLE_SSO = false;
      vi.restoreAllMocks();
    });

    it('adds Authorization Bearer header when account is active', async () => {
      mockState.getActiveAccount.mockReturnValue({ username: 'test@example.com' });
      mockState.acquireTokenSilent.mockResolvedValue({ accessToken: 'mock-token' });

      const handler = getInterceptorHandler();
      const config = { headers: {} };
      const result = (await handler.fulfilled(config)) as Record<string, Record<string, string>>;

      expect(result.headers.Authorization).toBe('Bearer mock-token');
    });

    it('rejects when no active account is found', async () => {
      mockState.getActiveAccount.mockReturnValue(null);

      const handler = getInterceptorHandler();
      const config = { headers: {} };

      await expect(handler.fulfilled(config)).rejects.toThrow(
        'No active account! Verify a user has been signed in and setActiveAccount has been called.',
      );
    });
  });
});

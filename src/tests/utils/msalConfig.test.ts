import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type MsalEvent = {
  eventType: string;
  payload?: {
    account?: {
      username?: string;
      localAccountId?: string;
      homeAccountId?: string;
      idTokenClaims?: Record<string, unknown>;
    };
    accessToken?: string;
  };
  error?: unknown;
};

type MsalConfigForTest = {
  system?: {
    loggerOptions?: {
      loggerCallback?: (level: number, message: string, containsPii: boolean) => void;
    };
  };
};

const state = vi.hoisted(() => ({
  activeAccount: null as unknown,
  allAccounts: [] as unknown[],
  lastConfig: null as MsalConfigForTest | null,
  callback: null as ((event: MsalEvent) => Promise<void> | void) | null,
  setActiveAccount: vi.fn((account: unknown) => {
    state.activeAccount = account;
  }),
}));

vi.mock('@azure/msal-browser', () => {
  class PublicClientApplication {
    constructor(config: unknown) {
      state.lastConfig = config as MsalConfigForTest;
    }

    getActiveAccount = vi.fn(() => state.activeAccount);

    getAllAccounts = vi.fn(() => state.allAccounts);

    setActiveAccount = state.setActiveAccount;

    addEventCallback = vi.fn((cb: (event: MsalEvent) => Promise<void> | void) => {
      state.callback = cb;
      return 'cb-id';
    });
  }

  return {
    PublicClientApplication,
    EventType: {
      LOGIN_SUCCESS: 'msal:loginSuccess',
      ACQUIRE_TOKEN_SUCCESS: 'msal:acquireTokenSuccess',
      SSO_SILENT_SUCCESS: 'msal:ssoSilentSuccess',
      LOGIN_FAILURE: 'msal:loginFailure',
      ACQUIRE_TOKEN_FAILURE: 'msal:acquireTokenFailure',
      SSO_SILENT_FAILURE: 'msal:ssoSilentFailure',
      LOGOUT_SUCCESS: 'msal:logoutSuccess',
      LOGOUT_FAILURE: 'msal:logoutFailure',
    },
    LogLevel: { Error: 0, Warning: 1, Info: 2, Verbose: 3 },
  };
});

const loadModule = async () => {
  vi.resetModules();
  return import('~/utils/msalConfig');
};

describe('msalConfig', () => {
  beforeEach(() => {
    state.activeAccount = null;
    state.allAccounts = [];
    state.lastConfig = null;
    state.callback = null;
    state.setActiveAccount.mockClear();
    sessionStorage.clear();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('exports instance and login scopes', async () => {
    const { msalInstance, loginRequest } = await loadModule();

    expect(msalInstance).toBeDefined();
    expect(Array.isArray(loginRequest.scopes)).toBe(true);
    expect(typeof loginRequest.scopes[0]).toBe('string');
  });

  it('restores first cached account when active account is missing', async () => {
    state.allAccounts = [{ username: 'cached@example.com' }];

    await loadModule();

    expect(state.setActiveAccount).toHaveBeenCalledWith({ username: 'cached@example.com' });
  });

  it('does not restore account when active account already exists', async () => {
    state.activeAccount = { username: 'active@example.com' };
    state.allAccounts = [{ username: 'cached@example.com' }];

    await loadModule();

    expect(state.setActiveAccount).not.toHaveBeenCalledWith({ username: 'cached@example.com' });
  });

  it('covers logger callback branches including pii and default level', async () => {
    await loadModule();

    const loggerCallback = state.lastConfig?.system?.loggerOptions?.loggerCallback;
    expect(typeof loggerCallback).toBe('function');
    if (typeof loggerCallback !== 'function') {
      throw new Error('loggerCallback was not initialized');
    }

    expect(() => loggerCallback(0, 'error-message', false)).not.toThrow();
    expect(() => loggerCallback(1, 'warning-message', false)).not.toThrow();
    expect(() => loggerCallback(2, 'info-message', false)).not.toThrow();
    expect(() => loggerCallback(3, 'verbose-message', false)).not.toThrow();
    expect(() => loggerCallback(999, 'unknown-level', false)).not.toThrow();
    expect(() => loggerCallback(0, 'pii-message', true)).not.toThrow();
  });

  it('handles logout and auth failure events', async () => {
    await loadModule();
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(state.callback).toBeTruthy();
    await state.callback?.({ eventType: 'msal:logoutSuccess' });
    await state.callback?.({ eventType: 'msal:logoutFailure', error: new Error('logout-failed') });
    await state.callback?.({ eventType: 'msal:loginFailure', error: new Error('login-failed') });
    await state.callback?.({ eventType: 'msal:acquireTokenFailure', error: 'token-failed' });
    await state.callback?.({ eventType: 'msal:ssoSilentFailure', error: 'sso-failed' });

    expect(infoSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('ignores non-success and success events without account payload', async () => {
    await loadModule();

    await state.callback?.({ eventType: 'not-handled' });
    await state.callback?.({ eventType: 'msal:loginSuccess' });
    await state.callback?.({
      eventType: 'msal:acquireTokenSuccess',
      payload: {
        accessToken: 'eyJ.token',
      },
    });

    expect(sessionStorage.length).toBe(0);
    expect(state.setActiveAccount).not.toHaveBeenCalled();
  });

  it('sets active account for successful auth with role array and oid', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    await loadModule();

    const account = {
      username: 'user@example.com',
      localAccountId: 'oid-123',
      homeAccountId: 'home-123',
      idTokenClaims: { roles: ['USER', 'ADMIN'] },
    };

    await state.callback?.({
      eventType: 'msal:loginSuccess',
      payload: {
        account,
        accessToken: 'eyJ.valid.jwt',
      },
    });

    expect(state.setActiveAccount).toHaveBeenCalledWith(account);
    expect(infoSpy).toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
  });

  it('does not write custom session keys during silent success', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    await loadModule();

    await state.callback?.({
      eventType: 'msal:ssoSilentSuccess',
      payload: {
        account: {
          username: 'user2@example.com',
          homeAccountId: 'home-456',
          idTokenClaims: { roles: 'ADMIN' },
        },
        accessToken: 'not-a-jwt',
      },
    });

    expect(infoSpy).toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
  });

  it('still handles auth success without writing custom session keys', async () => {
    await loadModule();

    await state.callback?.({
      eventType: 'msal:acquireTokenSuccess',
      payload: {
        account: {
          username: '',
          homeAccountId: '',
        },
        accessToken: 'eyJ.any',
      },
    });

    expect(sessionStorage.length).toBe(0);
    expect(state.setActiveAccount).toHaveBeenCalled();
  });
});

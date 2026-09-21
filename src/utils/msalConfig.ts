// MSAL configuration for Azure AD SSO — login, token acquisition, and session management.

import {
  PublicClientApplication,
  LogLevel,
  EventType,
  type Configuration,
  type EventMessage,
  type AuthenticationResult,
  type RedirectRequest,
} from '@azure/msal-browser';

import { appConfigs } from './appConfig';

// Core MSAL config — Azure AD app credentials, sessionStorage cache, and suppressed logs.
const msalConfig: Configuration = {
  auth: {
    clientId: appConfigs.MSAL_CLIENT_ID,
    authority: appConfigs.MSAL_AUTHORITY,
    redirectUri: appConfigs.MSAL_REDIRECT_URI,
    postLogoutRedirectUri: appConfigs.MSAL_REDIRECT_URI,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return; // never log PII
        switch (level) {
          case LogLevel.Error:
          case LogLevel.Info:
          case LogLevel.Verbose:
          case LogLevel.Warning:
            void message; // suppressed — remove to re-enable
            return;
          default:
            return;
        }
      },
    },
  },
};

// Shared MSAL instance — provided to React via <MsalProvider> in main.tsx.
const msalInstance = new PublicClientApplication(msalConfig);

// Restore cached account on page load to avoid re-login after refresh.
if (
  !msalInstance.getActiveAccount() &&
  msalInstance.getAllAccounts().length > 0
) {
  msalInstance.setActiveAccount(msalInstance.getAllAccounts()[0]);
}

// MSAL event listener — handles auth success/failure and persists user info to sessionStorage.
msalInstance.addEventCallback(async (event: EventMessage) => {
  // Logout events
  if (event.eventType === EventType.LOGOUT_SUCCESS) {
    console.info('[SSO] Logout successful — session cleared');
    return;
  }

  if (event.eventType === EventType.LOGOUT_FAILURE) {
    console.error('[SSO] Logout failed', event.error ?? event);
    return;
  }

  // Auth failure events
  if (
    event.eventType === EventType.LOGIN_FAILURE ||
    event.eventType === EventType.ACQUIRE_TOKEN_FAILURE ||
    event.eventType === EventType.SSO_SILENT_FAILURE
  ) {
    console.error(`[SSO] Auth failed — event: ${event.eventType}`, event.error ?? event);
    return;
  }

  // Only handle successful auth events
  const isSuccess =
    event.eventType === EventType.LOGIN_SUCCESS ||
    event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS ||
    event.eventType === EventType.SSO_SILENT_SUCCESS;

  if (!isSuccess || !event.payload) return;

  const payload = event.payload as AuthenticationResult;

  if (!payload.account) return;

  // Set active account
  msalInstance.setActiveAccount(payload.account);

  console.info(
    `[SSO] Login successful — event: ${event.eventType} | user: ${payload.account.username}`
  );

  // SSO admin/user check for debugging in browser console.
  const claims = (payload.account.idTokenClaims ?? {}) as Record<string, unknown>;
  const rolesClaim = claims.roles;
  const roles = Array.isArray(rolesClaim)
    ? rolesClaim.filter((role): role is string => typeof role === 'string')
    : typeof rolesClaim === 'string'
      ? [rolesClaim]
      : [];
  const isAdmin = roles.includes('ADMIN');

  console.info('[SSO] Role check', {
    user: payload.account.username,
    oid: payload.account.localAccountId,
    roles,
    isAdmin,
  });
  // End SSO admin/user check block.

  // No custom sessionStorage persistence here.
  // Runtime auth is handled through MSAL cache + acquireTokenSilent in apiClient.
});

// Login request scopes — must match Azure AD App Registration.
const loginRequest: RedirectRequest = {
  scopes: [appConfigs.MSAL_SCOPE],
};

export { msalInstance, loginRequest };

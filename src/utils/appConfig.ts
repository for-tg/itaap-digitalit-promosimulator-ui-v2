const localConfigs = {
  // [SATYAM COPY] backend on 8010/8011, frontend dev server on 3003
  // SSO disabled — backend runs with ENABLE_AUTH=false
  ENABLE_SSO: false,
  API_BASE_URL: 'http://127.0.0.1:8010',
  MSAL_CLIENT_ID: '10cb7490-9dc0-446f-b711-6637d63db75f',
  MSAL_AUTHORITY:
    'https://login.microsoftonline.com/1a407a2d-7675-4d17-8692-b3ac285306e4',
  MSAL_SCOPE:
    'api://itaap-digitalit-promosimulator-frontend-non-prod/User.Read.All',
  MSAL_REDIRECT_URI: 'http://localhost:3003',
};

// When accessed via VS Code devtunnel, the browser is remote so
// API_BASE_URL must be empty — axios then uses relative paths which
// Vite's proxy forwards to the local backend on port 8010.
const devTunnelConfigs = {
  ...localConfigs,
  API_BASE_URL: '',
};

const devConfigs = {
  ENABLE_SSO: false,
  API_BASE_URL: 'https://dev.apps.api.it.philips.com',
  MSAL_CLIENT_ID: '10cb7490-9dc0-446f-b711-6637d63db75f',
  MSAL_AUTHORITY:
    'https://login.microsoftonline.com/1a407a2d-7675-4d17-8692-b3ac285306e4',
  MSAL_SCOPE:
    'api://itaap-digitalit-promosimulator-frontend-non-prod/User.Read.All',
  MSAL_REDIRECT_URI:
    'https://dev.apps.api.it.philips.com/digitalit/itaap-digitalit-promosimulator-ui',
};

const testConfigs = {
  ENABLE_SSO: false,
  API_BASE_URL: '<ENTER_TEST_API_HOST>',
  MSAL_CLIENT_ID: '<ENTER_MSAL_NON_PROD_CLIENT_ID>',
  MSAL_AUTHORITY:
    'https://login.microsoftonline.com/1a407a2d-7675-4d17-8692-b3ac285306e4',
  MSAL_SCOPE: 'api://<ENTER_MSAL_NON_PROD_CLIENT_ID>/AppRoles.Read',
  MSAL_REDIRECT_URI: '<ENTER_TEST_MSAL_REDIRECT_URI>',
};

const accConfigs = {
  ENABLE_SSO: false,
  API_BASE_URL: '<ENTER_ACC_API_HOST>',
  MSAL_CLIENT_ID: '<ENTER_MSAL_NON_PROD_CLIENT_ID>',
  MSAL_AUTHORITY:
    'https://login.microsoftonline.com/1a407a2d-7675-4d17-8692-b3ac285306e4',
  MSAL_SCOPE: 'api://<ENTER_MSAL_NON_PROD_CLIENT_ID>/AppRoles.Read',
  MSAL_REDIRECT_URI: '<ENTER_ACC_MSAL_REDIRECT_URI>',
};

const prodConfigs = {
  ENABLE_SSO: false,
  API_BASE_URL: '<ENTER_PROD_API_HOST>',
  MSAL_CLIENT_ID: '<ENTER_MSAL_PROD_CLIENT_ID>',
  MSAL_AUTHORITY:
    'https://login.microsoftonline.com/1a407a2d-7675-4d17-8692-b3ac285306e4',
  MSAL_SCOPE: 'api://<ENTER_MSAL_PROD_CLIENT_ID>/AppRoles.Read',
  MSAL_REDIRECT_URI: '<ENTER_PROD_MSAL_REDIRECT_URI>',
};

export const appConfigs = (() => {
  const appURL = import.meta.url;

  if (appURL.includes('devtunnels.ms')) {
    return devTunnelConfigs; // remote browser — use relative URLs via Vite proxy
  } else if (appURL.includes('localhost') || appURL.includes('127.0.0.1')) {
    return localConfigs;
  } else if (appURL.includes('test')) {
    return testConfigs;
  } else if (appURL.includes('dev')) {
    return devConfigs;
  } else if (appURL.includes('acc')) {
    return accConfigs;
  } else {
    return prodConfigs;
  }
})();

// When accessed via devtunnel, all market calls use relative URLs (empty string).
// Locally, point to the specific backend port per market.
const _isDevTunnel = typeof import.meta !== 'undefined' &&
  import.meta.url?.includes('devtunnels.ms');

export const MARKET_API_URLS: Record<string, string> = {
  CZ: _isDevTunnel ? '' : localConfigs.API_BASE_URL,
  DE: _isDevTunnel ? '' : localConfigs.API_BASE_URL,
  CN: _isDevTunnel ? '' : 'http://127.0.0.1:8011',
};

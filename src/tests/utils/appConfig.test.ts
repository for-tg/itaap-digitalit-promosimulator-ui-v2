import { describe, expect, it } from 'vitest';

import { appConfigs } from '~/utils/appConfig';

describe('appConfig', () => {
  it('exports appConfigs with all required keys', () => {
    expect(appConfigs).toBeDefined();
    expect(appConfigs).toHaveProperty('ENABLE_SSO');
    expect(appConfigs).toHaveProperty('API_BASE_URL');
    expect(appConfigs).toHaveProperty('MSAL_CLIENT_ID');
    expect(appConfigs).toHaveProperty('MSAL_AUTHORITY');
    expect(appConfigs).toHaveProperty('MSAL_SCOPE');
    expect(appConfigs).toHaveProperty('MSAL_REDIRECT_URI');
  });

  it('ENABLE_SSO is a boolean', () => {
    expect(typeof appConfigs.ENABLE_SSO).toBe('boolean');
  });

  it('API_BASE_URL is a non-empty string', () => {
    expect(typeof appConfigs.API_BASE_URL).toBe('string');
    expect(appConfigs.API_BASE_URL.length).toBeGreaterThan(0);
  });

  it('MSAL_AUTHORITY contains microsoftonline.com', () => {
    expect(appConfigs.MSAL_AUTHORITY).toContain('microsoftonline.com');
  });

  it('MSAL_CLIENT_ID is a non-empty string', () => {
    expect(typeof appConfigs.MSAL_CLIENT_ID).toBe('string');
    expect(appConfigs.MSAL_CLIENT_ID.length).toBeGreaterThan(0);
  });

  it('MSAL_SCOPE is a non-empty string', () => {
    expect(typeof appConfigs.MSAL_SCOPE).toBe('string');
    expect(appConfigs.MSAL_SCOPE.length).toBeGreaterThan(0);
  });

  it('MSAL_REDIRECT_URI is a non-empty string', () => {
    expect(typeof appConfigs.MSAL_REDIRECT_URI).toBe('string');
    expect(appConfigs.MSAL_REDIRECT_URI.length).toBeGreaterThan(0);
  });

  it('applies a consistent config for the current environment', () => {
    // Verifies that the IIFE returns a single coherent config object.
    // The exact environment is determined by import.meta.url at runtime.
    const keys = Object.keys(appConfigs);
    expect(keys).toEqual(
      expect.arrayContaining([
        'ENABLE_SSO',
        'API_BASE_URL',
        'MSAL_CLIENT_ID',
        'MSAL_AUTHORITY',
        'MSAL_SCOPE',
        'MSAL_REDIRECT_URI',
      ]),
    );
  });
});

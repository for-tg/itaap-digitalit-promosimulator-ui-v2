import type { AccountInfo } from '@azure/msal-browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_ROLE, hasAdminRole } from '~/utils/authRoles';

const makeAccount = (roles?: unknown): AccountInfo => {
  if (roles === undefined) {
    return { idTokenClaims: undefined } as unknown as AccountInfo;
  }

  return {
    idTokenClaims: { roles },
  } as unknown as AccountInfo;
};

describe('authRoles', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_FORCE_ADMIN', 'false');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns false when account is null', () => {
    expect(hasAdminRole(null)).toBe(false);
  });

  it('returns false when account has no id token claims', () => {
    expect(hasAdminRole(makeAccount())).toBe(false);
  });

  it('returns true when roles array contains ADMIN role', () => {
    expect(hasAdminRole(makeAccount(['USER', ADMIN_ROLE]))).toBe(true);
  });

  it('returns false when roles array does not contain ADMIN role', () => {
    expect(hasAdminRole(makeAccount(['USER']))).toBe(false);
  });

  it('returns true when roles is ADMIN string', () => {
    expect(hasAdminRole(makeAccount(ADMIN_ROLE))).toBe(true);
  });

  it('returns false when roles is a non-string non-array value', () => {
    expect(hasAdminRole(makeAccount({ role: ADMIN_ROLE }))).toBe(false);
  });

  it('returns true when VITE_FORCE_ADMIN is true', () => {
    vi.stubEnv('VITE_FORCE_ADMIN', 'true');
    expect(hasAdminRole(null)).toBe(true);
  });
});

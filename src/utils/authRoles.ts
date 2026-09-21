import type { AccountInfo } from '@azure/msal-browser';

export const ADMIN_ROLE = 'admin';

export const hasAdminRole = (
  account: AccountInfo | null | undefined,
): boolean => {
  // Development-only override to force user experience regardless of token roles.
  if (import.meta.env.VITE_FORCE_USER === 'true') {
    return false;
  }

  // Development-only override
  if (import.meta.env.VITE_FORCE_ADMIN === 'true') {
    return true;
  }

  if (!account?.idTokenClaims) {
    return false;
  }

  const claims = account.idTokenClaims as Record<string, unknown>;
  const roles = claims.roles;

  if (Array.isArray(roles)) {
    return roles.some((role) => role === ADMIN_ROLE);
  }

  if (typeof roles === 'string') {
    return roles === ADMIN_ROLE;
  }

  return false;
};
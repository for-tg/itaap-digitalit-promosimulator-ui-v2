import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateAccessRequestPayload } from '~/types/rbac';

vi.mock('~/utils/apiClient', () => ({
  axiosInstance: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
  isAPIError: vi.fn(),
}));

import { axiosInstance, isAPIError } from '~/utils/apiClient';
import {
  approveAccessRequest,
  createAccessRequest,
  fetchAccessOptions,
  fetchAdminRequests,
  fetchMyAccess,
  getRbacErrorMessage,
  rejectAccessRequest,
} from '~/services/rbacService';

const mockGet = vi.mocked(axiosInstance.get);
const mockPost = vi.mocked(axiosInstance.post);
const mockPut = vi.mocked(axiosInstance.put);
const mockIsApiError = vi.mocked(isAPIError);

const PREFIX = '/itaap-digitalit-promosimulator-coreservice/api';

describe('rbacService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls access endpoints and returns expected data', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { regions: [{ regionId: 1, regionName: 'EMEA', countries: [] }] } })
      .mockResolvedValueOnce({
        data: {
          user: { id: 'u1', email: 'u@example.com', role: 'user' },
          access: { regions: [] },
        },
      })
      .mockResolvedValueOnce({ data: { requests: [{ accessId: 1 }] } });
    mockPost.mockResolvedValueOnce({ data: { message: 'ok', access: [] } });

    const payload: CreateAccessRequestPayload = {
      regionName: 'EMEA',
      countryCode: 'CZ',
      magName: 'RTB',
      retailers: ['All'],
    };

    await expect(fetchAccessOptions()).resolves.toEqual([{ regionId: 1, regionName: 'EMEA', countries: [] }]);
    await expect(fetchMyAccess()).resolves.toEqual({
      user: { id: 'u1', email: 'u@example.com', role: 'user' },
      access: { regions: [] },
    });
    await expect(createAccessRequest(payload)).resolves.toEqual({ message: 'ok', access: [] });
    await expect(fetchAdminRequests('pending')).resolves.toEqual([{ accessId: 1 }]);

    expect(mockGet).toHaveBeenNthCalledWith(1, `${PREFIX}/access/options`);
    expect(mockGet).toHaveBeenNthCalledWith(2, `${PREFIX}/access/me`);
    expect(mockPost).toHaveBeenNthCalledWith(1, `${PREFIX}/access/requests`, payload);
    expect(mockGet).toHaveBeenNthCalledWith(
      3,
      `${PREFIX}/admin/access/requests`,
      { params: { request_status: 'pending' } },
    );
  });

  it('calls approve and reject endpoints', async () => {
    mockPut.mockResolvedValue({ data: undefined });

    await approveAccessRequest(11);
    await rejectAccessRequest(12);

    expect(mockPut).toHaveBeenNthCalledWith(
      1,
      `${PREFIX}/admin/access/requests/11/approve`,
    );
    expect(mockPut).toHaveBeenNthCalledWith(
      2,
      `${PREFIX}/admin/access/requests/12/reject`,
    );
  });

  it('maps API errors and fallback messages', () => {
    mockIsApiError.mockReturnValue(true);

    const withDetailObject = {
      response: { status: 500, data: { detail: 'Detailed error' } },
    };
    expect(getRbacErrorMessage(withDetailObject, 'fallback')).toBe('Detailed error');

    const withDetailString = {
      response: { status: 500, data: 'Simple detail' },
    };
    expect(getRbacErrorMessage(withDetailString, 'fallback')).toBe('Simple detail');

    const forbidden = {
      response: { status: 403, data: {} },
    };
    expect(getRbacErrorMessage(forbidden, 'fallback')).toBe(
      'You do not have permission to perform this action.',
    );

    const conflict = {
      response: { status: 409, data: {} },
    };
    expect(getRbacErrorMessage(conflict, 'fallback', 'custom conflict')).toBe('custom conflict');

    mockIsApiError.mockReturnValue(false);
    expect(getRbacErrorMessage(new Error('x'), 'fallback')).toBe('fallback');
  });
});

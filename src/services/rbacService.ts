import { axiosInstance, isAPIError } from '~/utils/apiClient';
import type {
  AccessOptionsRegion,
  AccessOptionsResponse,
  CreateAccessRequestPayload,
  CreateAccessRequestResponse,
  MyAccessResponse,
  AdminAccessRequest,
  AccessStatus,
} from '~/types/rbac';

const API_PREFIX = '/itaap-digitalit-promosimulator-coreservice/api';

// ── Normal user ──────────────────────────────────────────────────────────────

export async function fetchAccessOptions(): Promise<AccessOptionsRegion[]> {
  const res = await axiosInstance.get<AccessOptionsResponse>(
    `${API_PREFIX}/access/options`,
  );
  return res.data.regions ?? [];
}

export async function fetchMyAccess(): Promise<MyAccessResponse> {
  const res = await axiosInstance.get<MyAccessResponse>(
    `${API_PREFIX}/access/me`,
  );
  return res.data;
}

export async function createAccessRequest(
  payload: CreateAccessRequestPayload,
): Promise<CreateAccessRequestResponse> {
  const res = await axiosInstance.post<CreateAccessRequestResponse>(
    `${API_PREFIX}/access/requests`,
    payload,
  );
  return res.data;
}

// ── Admin ────────────────────────────────────────────────────────────────────

export async function fetchAdminRequests(
  status: AccessStatus,
): Promise<AdminAccessRequest[]> {
  const res = await axiosInstance.get<{ requests: AdminAccessRequest[] }>(
    `${API_PREFIX}/admin/access/requests`,
    { params: { request_status: status } },
  );
  return res.data.requests ?? [];
}

export async function approveAccessRequest(accessId: number): Promise<void> {
  await axiosInstance.put(
    `${API_PREFIX}/admin/access/requests/${accessId}/approve`,
  );
}

export async function rejectAccessRequest(accessId: number): Promise<void> {
  await axiosInstance.put(
    `${API_PREFIX}/admin/access/requests/${accessId}/reject`,
  );
}

// ── Error handling ───────────────────────────────────────────────────────────

export const getRbacErrorMessage = (
  error: unknown,
  fallbackMessage: string,
  conflictMessage = 'The request conflicts with the current access state.',
): string => {
  if (isAPIError(error)) {
    const detail = error.response?.data;

    if (
      typeof detail === 'object' &&
      detail !== null &&
      'detail' in detail &&
      typeof detail.detail === 'string'
    ) {
      return detail.detail;
    }

    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    switch (error.response?.status) {
      case 400:
        return 'Invalid request. Check the selected options and try again.';
      case 401:
        return 'Your session has expired. Please sign in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested access record could not be found.';
      case 409:
        return conflictMessage;
      case 500:
        return 'A server error occurred. Please try again.';
      default:
        break;
    }
  }

  return fallbackMessage;
};

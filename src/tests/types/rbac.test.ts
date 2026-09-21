import { describe, expect, it } from 'vitest';

import * as rbacModule from '~/types/rbac';
import type {
  AccessOptionsCountry,
  AccessOptionsMag,
  AccessOptionsRegion,
  AccessOptionsResponse,
  AccessOptionsRetailer,
  AccessRecord,
  AccessStatus,
  AdminAccessRequest,
  CreateAccessRequestPayload,
  CreateAccessRequestResponse,
  MyAccessCountry,
  MyAccessData,
  MyAccessMag,
  MyAccessRegion,
  MyAccessResponse,
  MyAccessRetailer,
  MyAccessUser,
} from '~/types/rbac';

describe('rbac types', () => {
  it('loads module at runtime', () => {
    expect(rbacModule).toBeDefined();
    expect(typeof rbacModule).toBe('object');
  });

  it('accepts access options response shape', () => {
    const retailer: AccessOptionsRetailer = { retailerName: 'Retailer A' };
    const mag: AccessOptionsMag = { magName: 'MAG 1', retailers: [retailer] };
    const country: AccessOptionsCountry = {
      countryCode: 'CZ',
      countryName: 'Czech Republic',
      mags: [mag],
    };
    const region: AccessOptionsRegion = {
      regionId: 1,
      regionName: 'Europe',
      countries: [country],
    };
    const response: AccessOptionsResponse = { regions: [region] };

    expect(response.regions[0].countries[0].mags[0].retailers[0].retailerName).toBe('Retailer A');
  });

  it('accepts create access request payload and response shapes', () => {
    const payload: CreateAccessRequestPayload = {
      regionName: 'Europe',
      countryCode: 'CZ',
      magName: 'MAG 1',
      retailers: ['Retailer A', 'Retailer B'],
    };
    const status: AccessStatus = 'approved';
    const accessRecord: AccessRecord = {
      accessId: 42,
      regionName: 'Europe',
      countryCode: 'CZ',
      countryName: 'Czech Republic',
      magName: 'MAG 1',
      retailerName: 'Retailer A',
      status,
      requestedOn: '2026-01-01T10:00:00Z',
      approvedBy: 'admin@company.com',
      approvedOn: '2026-01-02T12:00:00Z',
    };
    const createResponse: CreateAccessRequestResponse = {
      message: 'created',
      access: [accessRecord],
    };

    expect(payload.retailers).toHaveLength(2);
    expect(createResponse.access[0].status).toBe('approved');
  });

  it('accepts my access response hierarchy', () => {
    const user: MyAccessUser = {
      id: 'u-1',
      email: 'user@company.com',
      role: 'viewer',
    };
    const myRetailer: MyAccessRetailer = { name: 'Retailer A', status: 'pending' };
    const myMag: MyAccessMag = { magName: 'MAG 1', retailers: [myRetailer] };
    const myCountry: MyAccessCountry = {
      countryCode: 'CZ',
      countryName: 'Czech Republic',
      mags: [myMag],
    };
    const myRegion: MyAccessRegion = {
      regionId: 1,
      regionName: 'Europe',
      countries: [myCountry],
    };
    const access: MyAccessData = { regions: [myRegion] };
    const response: MyAccessResponse = { user, access };

    expect(response.user.email).toBe('user@company.com');
    expect(response.access.regions[0].countries[0].mags[0].retailers[0].status).toBe('pending');
  });

  it('accepts admin access request shape with nullable approval fields', () => {
    const request: AdminAccessRequest = {
      accessId: 7,
      userId: 'u-2',
      email: 'requestor@company.com',
      role: 'editor',
      regionName: 'Europe',
      countryCode: 'CZ',
      countryName: 'Czech Republic',
      magName: 'MAG 2',
      retailerName: 'Retailer C',
      status: 'rejected',
      requestedOn: '2026-01-04T09:15:00Z',
      approvedBy: null,
      approvedOn: null,
    };

    expect(request.status).toBe('rejected');
    expect(request.approvedBy).toBeNull();
    expect(request.approvedOn).toBeNull();
  });
});

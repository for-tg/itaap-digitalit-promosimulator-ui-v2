// ── GET /access/options ───────────────────────────────────────────────────────

export interface AccessOptionsRetailer {
  retailerName: string;
}

export interface AccessOptionsMag {
  magName: string;
  retailers: AccessOptionsRetailer[];
}

export interface AccessOptionsCountry {
  countryCode: string;
  countryName: string;
  mags: AccessOptionsMag[];
}

export interface AccessOptionsRegion {
  regionId: number;
  regionName: string;
  countries: AccessOptionsCountry[];
}

export interface AccessOptionsResponse {
  regions: AccessOptionsRegion[];
}

// ── POST /access/requests ─────────────────────────────────────────────────────

export interface CreateAccessRequestPayload {
  regionName: string;
  countryCode: string;
  magName: string;
  retailers: string[];
}

export type AccessStatus = 'pending' | 'approved' | 'rejected';

export interface AccessRecord {
  accessId: number;
  regionName: string;
  countryCode: string;
  countryName?: string;
  magName: string;
  retailerName: string;
  status: AccessStatus;
  requestedOn?: string;
  approvedBy?: string | null;
  approvedOn?: string | null;
}

export interface CreateAccessRequestResponse {
  message: string;
  access: AccessRecord[];
}

// ── GET /access/me ────────────────────────────────────────────────────────────

export interface MyAccessUser {
  id: string;
  email: string;
  role: string;
}

export interface MyAccessRetailer {
  name: string;
  status: AccessStatus;
}

export interface MyAccessMag {
  magName: string;
  retailers: MyAccessRetailer[];
}

export interface MyAccessCountry {
  countryCode: string;
  countryName: string;
  mags: MyAccessMag[];
}

export interface MyAccessRegion {
  regionId: number;
  regionName: string;
  countries: MyAccessCountry[];
}

export interface MyAccessData {
  regions: MyAccessRegion[];
}

export interface MyAccessResponse {
  user: MyAccessUser;
  access: MyAccessData;
}

// ── GET /admin/access/requests ────────────────────────────────────────────────

export interface AdminAccessRequest {
  accessId: number;
  userId: string;
  email: string;
  role: string;
  regionName: string;
  countryCode: string;
  countryName: string;
  magName: string;
  retailerName: string;
  status: AccessStatus;
  requestedOn: string;
  approvedBy: string | null;
  approvedOn: string | null;
}

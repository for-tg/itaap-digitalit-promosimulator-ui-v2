import axios, { AxiosError } from 'axios';

import { appConfigs, MARKET_API_URLS } from './appConfig';
import { msalInstance, loginRequest } from './msalConfig';

export { isAxiosError as isAPIError } from 'axios';

export const axiosInstance = axios.create({
  baseURL: appConfigs.API_BASE_URL,
});

export function setActiveMarket(market: string) {
  const url = MARKET_API_URLS[market] ?? appConfigs.API_BASE_URL;
  axiosInstance.defaults.baseURL = url;
}

axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      if (appConfigs.ENABLE_SSO === true) {
        const activeAccount = msalInstance.getActiveAccount();
        if (!activeAccount) {
          throw Error(
            'No active account! Verify a user has been signed in and setActiveAccount has been called.'
          );
        }
        const msalResponse = await msalInstance.acquireTokenSilent({
          ...loginRequest,
          account: activeAccount,
        });
        config.headers.Authorization = `Bearer ${msalResponse.accessToken}`;
      }

      return config;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  (error: AxiosError) => Promise.reject(error)
);

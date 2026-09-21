import { describe, expect, it } from 'vitest';

import * as historicalModule from '~/types/historical';

describe('historical types', () => {
  it('loads module at runtime', () => {
    expect(historicalModule).toBeDefined();
    expect(typeof historicalModule).toBe('object');
  });

  // it('accepts a valid historical summary shape', () => {
  //   const summary: HistoricalSummary = {
  //     year: 2025,
  //     n_skus_total: 2,
  //     totals: {
  //       n_skus: 2,
  //       revenue: 2000,
  //       profit: 750,
  //       spend: 300,
  //       return_per_kc: 2.5,
  //       volume_factor: 1.5,
  //     },
  //     portfolio: [
  //       {
  //         sku: 'SKU-1',
  //         band: 'A',
  //         spend: 100,
  //         revenue: 800,
  //         profit: 300,
  //         return_per_kc: 3,
  //       },
  //     ],
  //     weekly: {
  //       'SKU-1': [
  //         {
  //           week: 1,
  //           spend: 10,
  //           revenue: 90,
  //           profit: 30,
  //           return_per_kc: 3,
  //         },
  //       ],
  //     },
  //   };

  //   expect(summary.year).toBe(2025);
  //   expect(summary.portfolio[0].sku).toBe('SKU-1');
  //   expect(summary.weekly['SKU-1'][0].week).toBe(1);
  // });
});

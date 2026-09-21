import { describe, expect, it } from 'vitest';

import {
  ANALYSIS_YEARS,
  BANDS,
  DEPTH_COLORS,
  ENABLED_MARKETS,
  MAG_MAP,
  MARKET_OPTIONS,
  METRIC_AXIS_LABELS,
  METRIC_LABELS,
  PERIODS,
  RETAILER_MAP,
  STAGE_IDS,
  STEP_LABELS,
  TODAY_LABEL,
} from '~/constants/simulator';

describe('simulator constants', () => {
  describe('MARKET_OPTIONS', () => {
    it('contains CZ, CN and US', () => {
      expect(MARKET_OPTIONS).toContain('CZ');
      expect(MARKET_OPTIONS).toContain('CN');
      expect(MARKET_OPTIONS).toContain('US');
    });

    it('has exactly 3 markets', () => {
      expect(MARKET_OPTIONS).toHaveLength(3);
    });
  });

  describe('ENABLED_MARKETS', () => {
    it('only enables CZ', () => {
      expect(ENABLED_MARKETS).toEqual(['CZ']);
    });

    it('is a subset of MARKET_OPTIONS', () => {
      ENABLED_MARKETS.forEach((m) => {
        expect(MARKET_OPTIONS).toContain(m);
      });
    });
  });

  describe('MAG_MAP', () => {
    it('maps CZ to RTB', () => {
      expect(MAG_MAP.CZ).toEqual(['RTB']);
    });

    it('maps CN to SHAVING', () => {
      expect(MAG_MAP.CN).toEqual(['SHAVING']);
    });

    it('maps US to RTB and BH', () => {
      expect(MAG_MAP.US).toContain('RTB');
      expect(MAG_MAP.US).toContain('BH');
    });
  });

  describe('RETAILER_MAP', () => {
    it('maps CZ|RTB to All', () => {
      expect(RETAILER_MAP['CZ|RTB']).toEqual(['All']);
    });

    it('maps CN|SHAVING to Tmall', () => {
      expect(RETAILER_MAP['CN|SHAVING']).toEqual(['Tmall']);
    });

    it('maps US|RTB to multiple retailers', () => {
      const retailers = RETAILER_MAP['US|RTB'];
      expect(retailers).toContain('All');
      expect(retailers.length).toBeGreaterThan(1);
    });
  });

  describe('ANALYSIS_YEARS', () => {
    it('contains at least one year', () => {
      expect(ANALYSIS_YEARS.length).toBeGreaterThan(0);
    });

    it('contains only valid year numbers', () => {
      ANALYSIS_YEARS.forEach((year) => {
        expect(year).toBeGreaterThan(2000);
        expect(year).toBeLessThan(2100);
      });
    });

    it('contains year 2024', () => {
      expect(ANALYSIS_YEARS).toContain(2024);
    });
  });

  describe('PERIODS', () => {
    it('contains fullYear', () => {
      expect(PERIODS).toContain('fullYear');
    });

    it('contains all quarters Q1-Q4', () => {
      expect(PERIODS).toContain('Q1');
      expect(PERIODS).toContain('Q2');
      expect(PERIODS).toContain('Q3');
      expect(PERIODS).toContain('Q4');
    });

    it('has exactly 5 periods', () => {
      expect(PERIODS).toHaveLength(5);
    });
  });

  describe('BANDS', () => {
    it('contains All, LRTB, MRTB and HRTB', () => {
      expect(BANDS).toContain('All');
      expect(BANDS).toContain('LRTB');
      expect(BANDS).toContain('MRTB');
      expect(BANDS).toContain('HRTB');
    });
  });

  describe('METRIC_LABELS', () => {
    it('has human-readable label for incr_units', () => {
      expect(METRIC_LABELS['incr_units']).toBe('Incremental units');
    });

    it('has human-readable label for return_per_kc', () => {
      expect(METRIC_LABELS['return_per_kc']).toBe('Promo ROI (%)');
    });

    it('has label for revenue', () => {
      expect(METRIC_LABELS['revenue']).toBe('Revenue');
    });

    it('has label for profit', () => {
      expect(METRIC_LABELS['profit']).toBe('Profit');
    });
  });

  describe('METRIC_AXIS_LABELS', () => {
    it('has axis label for incr_units', () => {
      expect(METRIC_AXIS_LABELS['incr_units']).toBe('Incremental units');
    });

    it('has axis label for return_per_kc', () => {
      expect(METRIC_AXIS_LABELS['return_per_kc']).toBe('Promo ROI (%)');
    });

    it('has axis label for revenue', () => {
      expect(METRIC_AXIS_LABELS['revenue']).toBe('Revenue');
    });
  });

  describe('DEPTH_COLORS', () => {
    it('contains 8 color values', () => {
      expect(DEPTH_COLORS).toHaveLength(8);
    });

    it('all values are valid hex color strings', () => {
      DEPTH_COLORS.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('STAGE_IDS', () => {
    it('contains historical, config and optimized', () => {
      expect(STAGE_IDS).toContain('historical');
      expect(STAGE_IDS).toContain('config');
      expect(STAGE_IDS).toContain('optimized');
    });

    it('has exactly 3 stages', () => {
      expect(STAGE_IDS).toHaveLength(3);
    });

    it('is ordered: historical → config → optimized', () => {
      expect(STAGE_IDS[0]).toBe('historical');
      expect(STAGE_IDS[1]).toBe('config');
      expect(STAGE_IDS[2]).toBe('optimized');
    });
  });

  describe('STEP_LABELS', () => {
    it('has a label for every stage', () => {
      STAGE_IDS.forEach((id) => {
        expect(STEP_LABELS[id]).toBeDefined();
        expect(STEP_LABELS[id].length).toBeGreaterThan(0);
      });
    });

    it('historical stage label contains Historical', () => {
      expect(STEP_LABELS['historical']).toContain('Historical');
    });
  });

  describe('TODAY_LABEL', () => {
    it('is a non-empty string', () => {
      expect(typeof TODAY_LABEL).toBe('string');
      expect(TODAY_LABEL.length).toBeGreaterThan(0);
    });
  });
});

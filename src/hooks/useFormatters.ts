import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useSimulator } from '~/contexts/SimulatorContext';

/** Formats an integer with the provided currency symbol (e.g. "12,345 €"). */
export const kc = (v: number, currencySymbol = ''): string =>
  `${Math.round(v).toLocaleString('en-US')} ${currencySymbol}`.trim();

/** Formats an integer with thousand-separators (no unit). */
export const num = (v: number): string =>
  Math.round(v).toLocaleString('en-US');

/** Average recommended promo depth across timeline weeks that are > 0. */
export const useAvgOptDepth = (): string => {
  const { results } = useSimulator();

  return useMemo(() => {
    if (!results?.timeline) return '0';

    let sum = 0;
    let count = 0;

    Object.values(results.timeline).forEach((entry) => {
      entry.opt_disc.forEach((d) => {
        if (d > 0) {
          sum += d;
          count++;
        }
      });
    });

    return count ? (sum / count).toFixed(0) : '0';
  }, [results]);
};

/** Rail summary cards for the current stage. */
export const useRailCards = () => {
  const { results, stage } = useSimulator();
  const { t } = useTranslation();

  return useMemo(() => {
    if (results && stage === 'optimized') {
      const { current, recommended } = results.compare;
      const sym = results?.currency?.symbol ?? '';
      const vsLabel = results.compare_vs_base
        ? t('descriptions.noPromo')
        : t('descriptions.actual');

      // Revenue
      const revDelta = recommended.turnover - current.turnover;
      // IGM
      const optIgm = recommended.igm ?? 0;
      const actIgm = current.igm ?? 0;
      const igmDelta = recommended.igm_delta ?? (optIgm - actIgm);
      // Margin
      const optMarginPct = recommended.igm_margin_pct ?? recommended.margin;
      const actMarginPct = current.igm_margin_pct ?? current.margin;
      const marginDeltaPp = optMarginPct - actMarginPct;
      // Incremental lift
      const optLiftPct = (results.volume_factor - 1) * 100;
      const actLiftPct = (results.volume_factor_actual - 1) * 100;
      const liftDelta = optLiftPct - actLiftPct;
      // Promo Effectiveness
      const optEff = recommended.promo_effectiveness ?? null;
      const actEff = current.promo_effectiveness ?? null;

      type Dir = 'up' | 'down' | 'flat';
      const dir = (v: number): Dir => v >= 0 ? 'up' : 'down';

      return [
        {
          label: t('metrics.revenue'),
          value: kc(recommended.turnover, sym),
          delta: `${revDelta >= 0 ? '↑ +' : '↓ '}${kc(revDelta, sym)} vs ${vsLabel}`,
          direction: dir(revDelta),
        },
        {
          label: t('metrics.igm'),
          value: kc(optIgm, sym),
          delta: `${igmDelta >= 0 ? '↑ +' : '↓ '}${kc(igmDelta, sym)} vs ${vsLabel}`,
          direction: dir(igmDelta),
        },
        {
          label: t('metrics.igmMargin'),
          value: `${optMarginPct.toFixed(1)}%`,
          delta: `${marginDeltaPp >= 0 ? '↑ +' : '↓ '}${Math.abs(marginDeltaPp).toFixed(1)}pp vs ${vsLabel}`,
          direction: dir(marginDeltaPp),
        },
        {
          label: t('metrics.incrementalLift'),
          value: `${optLiftPct >= 0 ? '+' : ''}${optLiftPct.toFixed(1)}%`,
          delta: `${liftDelta >= 0 ? '↑ +' : '↓ '}${Math.abs(liftDelta).toFixed(1)}pp vs ${vsLabel}`,
          direction: dir(liftDelta),
        },
        {
          label: t('metrics.promoEffectiveness'),
          value: optEff != null ? `${(1 + optEff).toFixed(2)}×` : '—',
          delta: actEff != null && optEff != null
            ? `vs ${(1 + actEff).toFixed(2)}× ${vsLabel}`
            : t('descriptions.incrementalRevenuePerSpend'),
          direction: 'up' as Dir,
        },
      ];
    }

    return null;
  }, [results, stage, t]);
};

/** Rail summary cards for Historical and Config stages — same format as
 *  useRailCards(), deltas shown vs no-promo baseline. */
export const useHistoricalRailCards = () => {
  const { historicalSummary, histYear, allSkus } = useSimulator();
  const { t } = useTranslation();

  return useMemo(() => {
    const tots = historicalSummary?.totals;
    const sym = historicalSummary?.currency?.symbol ?? '';
    const vsLabel = t('descriptions.noPromo');
    type Dir = 'up' | 'down' | 'flat';
    const dir = (v: number): Dir => v >= 0 ? 'up' : 'down';

    const revenueVal = tots?.revenue ?? 0;
    const baseRevenue = tots?.base_revenue ?? 0;
    const revDelta = revenueVal - baseRevenue;

    const igmVal = tots?.igm ?? 0;
    const baseIgm = tots?.base_igm ?? 0;
    const igmDelta = igmVal - baseIgm;

    const igmMargin = tots?.igm_margin_pct ?? 0;
    const baseIgmMargin = tots?.base_igm_margin_pct ?? 0;
    const marginDelta = igmMargin - baseIgmMargin;

    const vf = tots?.volume_factor ?? 1;
    const liftPct = (vf - 1) * 100;

    const eff = tots?.promo_effectiveness ?? null;
    const count = tots?.n_skus ?? allSkus.length;

    return [
      {
        label: t('metrics.revenue'),
        value: tots ? kc(revenueVal, sym) : '—',
        delta: tots && baseRevenue > 0
          ? `${revDelta >= 0 ? '↑ +' : '↓ '}${kc(revDelta, sym)} vs ${vsLabel}`
          : `${count} SKUs · ${histYear}`,
        direction: dir(revDelta),
      },
      {
        label: t('metrics.igm'),
        value: tots?.igm != null ? kc(igmVal, sym) : '—',
        delta: tots && tots.base_igm != null
          ? `${igmDelta >= 0 ? '↑ +' : '↓ '}${kc(igmDelta, sym)} vs ${vsLabel}`
          : `${igmMargin.toFixed(1)}% ${t('metrics.igmMargin')}`,
        direction: dir(igmDelta),
      },
      {
        label: t('metrics.igmMargin'),
        value: tots?.igm_margin_pct != null ? `${igmMargin.toFixed(1)}%` : '—',
        delta: tots && tots.base_igm_margin_pct != null
          ? `${marginDelta >= 0 ? '↑ +' : '↓ '}${Math.abs(marginDelta).toFixed(1)}pp vs ${vsLabel}`
          : t('descriptions.historicalActual'),
        direction: dir(marginDelta),
      },
      {
        label: t('metrics.incrementalLift'),
        value: `${liftPct >= 0 ? '+' : ''}${liftPct.toFixed(1)}%`,
        delta: t('descriptions.vsNoPromoBaseline'),
        direction: dir(liftPct),
      },
      {
        label: t('metrics.promoEffectiveness'),
        value: eff != null ? `${(1 + eff).toFixed(2)}×` : '—',
        delta: t('descriptions.incrementalRevenuePerSpend'),
        direction: 'up' as Dir,
      },
    ];
  }, [historicalSummary, histYear, allSkus, t]);
};

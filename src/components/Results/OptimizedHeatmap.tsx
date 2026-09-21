import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SimulationResponse } from '~/types/simulation';
import { formatKc } from '~/components/Historical/chartUtils';

interface Props {
  results: SimulationResponse;
  selectedSkus: string[];
}

function cellColor(value: number | null, domainPos: number, domainNeg: number): string {
  if (value == null) return 'var(--surface-2)';
  if (value === 0)   return 'var(--surface-2)';
  const pole = value > 0 ? 'var(--good)' : 'var(--critical)';
  const domain = value > 0 ? domainPos : domainNeg;
  const intensity = Math.min(Math.abs(value) / Math.max(domain, 1e-9), 1);
  return `color-mix(in oklab, ${pole} ${Math.round(intensity * 100)}%, var(--surface-2))`;
}

export const OptimizedHeatmap = memo(({ results, selectedSkus }: Props) => {
  const { t } = useTranslation();
  const metric = 'effectiveness' as const;
  const [tooltip, setTooltip] = useState<null | {
    x: number; y: number; sku: string; week: number;
    effectiveness: number | null; incrUnits: number | null;
    optSpend: number;
  }>(null);

  const u = results.weekly_chart_units;
  const sym = results.currency?.symbol ?? '';

  const { grid, weeks, skus, domainPos, domainNeg } = useMemo(() => {
    if (!u) return { grid: new Map(), weeks: [] as number[], skus: [] as string[], domainPos: 1, domainNeg: 1 };

    const skuList = selectedSkus.filter((s) => u.per_sku[s]);
    const weekSet = new Set<number>();
    u.weeks.forEach((w) => weekSet.add(w));
    const weekList = Array.from(weekSet).sort((a, b) => a - b);

    let maxPos = 0, maxNeg = 0;
    const data = new Map<string, { effectiveness: number | null; incrUnits: number | null; optSpend: number }>();

    skuList.forEach((sku) => {
      const d = u.per_sku[sku];
      u.weeks.forEach((w, i) => {
        const spend = d.opt_spend?.[i] ?? 0;
        const optRev  = d.opt_rev?.[i]  ?? 0;
        const baseRev = d.base_rev?.[i] ?? 0;
        const optQty  = d.optimal[i]    ?? 0;
        const baseQty = d.base[i]       ?? 0;

        const eff   = spend > 0.5 ? (optRev - baseRev) / spend : null;
        const incr  = optQty - baseQty;

        const val = metric === 'effectiveness' ? eff : incr;
        if (val != null) {
          if (val > 0) maxPos = Math.max(maxPos, val);
          else maxNeg = Math.max(maxNeg, -val);
        }

        data.set(`${sku}__${w}`, { effectiveness: eff, incrUnits: incr, optSpend: spend });
      });
    });

    return { grid: data, weeks: weekList, skus: skuList, domainPos: maxPos || 1, domainNeg: maxNeg || 1 };
  }, [u, selectedSkus, metric]);

  const cellVal = (key: string): number | null => {
    const d = grid.get(key);
    if (!d) return null;
    return metric === 'effectiveness' ? d.effectiveness : d.incrUnits;
  };

  if (!u || skus.length === 0) {
    return <p className="note" style={{ padding: 24 }}>{t('common.noData')}</p>;
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ padding: '14px 16px', overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: '2px', fontSize: 10.5, width: '100%', tableLayout: 'fixed' }}
          role="img" aria-label={t('tabs.promoEffectiveness')}>
          <colgroup><col style={{ width: 140 }} /></colgroup>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, zIndex: 2, background: 'var(--surface)', fontSize: 0 }} />
              {weeks.map((wk) => (
                <th key={wk} style={{ fontSize: 8, color: 'var(--muted)', textAlign: 'center', padding: '2px 0', fontWeight: 400 }}>
                  {wk % 4 === 0 || wk === 1 ? wk : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {skus.map((sku) => (
              <tr key={sku}>
                <td style={{
                  position: 'sticky', left: 0, zIndex: 1,
                  fontSize: 10.5, fontWeight: 600, color: 'var(--ink)',
                  background: 'var(--surface-2)', borderRadius: 3,
                  padding: '4px 6px', whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{sku}</td>
                {weeks.map((wk) => {
                  const key = `${sku}__${wk}`;
                  const val = cellVal(key);
                  const d = grid.get(key);
                  return (
                    <td key={wk}
                      onMouseEnter={(e) => d && setTooltip({
                        x: e.clientX, y: e.clientY, sku, week: wk,
                        effectiveness: d.effectiveness, incrUnits: d.incrUnits, optSpend: d.optSpend,
                      })}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        height: 20, borderRadius: 2,
                        background: cellColor(val, domainPos, domainNeg),
                        cursor: val != null ? 'pointer' : 'default',
                        transition: 'opacity 0.1s',
                      }}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 4px 4px', flexWrap: 'wrap', fontSize: 11, color: 'var(--body)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 90, height: 10, borderRadius: 3, background: 'linear-gradient(to right, var(--critical), var(--surface-2), var(--good))' }} />
          {metric === 'effectiveness'
            ? t('charts.lowerToHigherEffectiveness')
            : t('charts.lowerToHigherIncrementalUnits')}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: 'var(--surface-2)', border: '1px solid var(--line)' }} />
          {t('charts.noPromoThisWeek')}
        </span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 10,
          background: '#213b55', color: '#fff', borderRadius: 6,
          padding: '8px 12px', fontSize: 11, pointerEvents: 'none', zIndex: 999, lineHeight: 1.7,
        }}>
          <b>{tooltip.sku}</b> · W{tooltip.week}<br />
          {t('metrics.promoSpend')}: {formatKc(tooltip.optSpend)} {sym}<br />
          {t('metrics.incrementalUnits')}:{' '}
          {tooltip.incrUnits != null ? `${tooltip.incrUnits >= 0 ? '+' : ''}${Math.round(tooltip.incrUnits).toLocaleString('en-US')}` : '—'}<br />
          {t('metrics.promoEffectiveness')}:{' '}
          {tooltip.effectiveness != null ? `${(1 + tooltip.effectiveness).toFixed(2)}×` : t('charts.noPromoThisWeek')}
        </div>
      )}
    </div>
  );
});

OptimizedHeatmap.displayName = 'OptimizedHeatmap';

import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { PortfolioRow, WeeklyRow } from '~/types/historical';
import { formatKc } from './chartUtils';

export type HeatmapMetric = 'effectiveness' | 'incremental_units';

interface Props {
  rows: PortfolioRow[];
  weekly: Record<string, WeeklyRow[]>;
  currencySymbol?: string;
  metric: HeatmapMetric;
}

const BAND_ORDER = ['LRTB', 'MRTB', 'HRTB'];
const BAND_LABELS: Record<string, string> = { LRTB: 'Low RTB', MRTB: 'Mid RTB', HRTB: 'High RTB' };

interface CellDatum {
  effectiveness: number | null;
  incrUnits: number | null;
  spend: number;
  revenue: number;
  baseRevenue: number | undefined;
  incrementalRevenue: number | null;
  qtyActual: number | undefined;
  qtyBase: number | undefined;
}

function cellValue(d: CellDatum | undefined, metric: HeatmapMetric): number | null {
  if (!d) return null;
  return metric === 'effectiveness' ? d.effectiveness : d.incrUnits;
}

function divergeColor(value: number | null, domPos: number, domNeg: number): string {
  if (value == null) return 'var(--surface-2)';
  if (value === 0)   return 'var(--surface-2)';
  const pole = value > 0 ? 'var(--good)' : 'var(--critical)';
  const domain = value > 0 ? domPos : domNeg;
  const pct = Math.round(Math.min(Math.abs(value) / Math.max(domain, 1e-9), 1) * 100);
  return `color-mix(in oklab, ${pole} ${pct}%, var(--surface-2))`;
}

function median(vals: number[]): number | null {
  const s = vals.filter((v) => isFinite(v)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

export const HistoricalHeatmap = memo(({ rows, weekly, currencySymbol = '', metric }: Props) => {
  const { t } = useTranslation();
  const [expandedBands, setExpandedBands] = useState<Set<string>>(new Set());
  const [tooltip, setTooltip] = useState<null | {
    x: number; y: number; label: string; week: number; cell: CellDatum;
  }>(null);

  const toggleBand = (band: string) =>
    setExpandedBands((prev) => {
      const next = new Set(prev);
      next.has(band) ? next.delete(band) : next.add(band);
      return next;
    });

  const { bandMap, weeks, grid, domPos, domNeg, bandAgg } = useMemo(() => {
    // Group rows by band
    const map: Record<string, PortfolioRow[]> = {};
    rows.forEach((r) => {
      const b = BAND_ORDER.includes(r.band) ? r.band : 'Other';
      if (!map[b]) map[b] = [];
      map[b].push(r);
    });

    // Union of all weeks
    const weekSet = new Set<number>();
    rows.forEach((r) => weekly[r.sku]?.forEach((w) => weekSet.add(w.week)));
    const weekList = Array.from(weekSet).sort((a, b) => a - b);

    // Build per-SKU cell grid and compute domain
    let maxPos = 0, maxNeg = 0;
    const g = new Map<string, CellDatum>();
    rows.forEach((r) => {
      weekly[r.sku]?.forEach((w) => {
        const hasPromo = w.spend > 1;
        const incrRev = hasPromo && w.base_revenue != null ? w.revenue - w.base_revenue : null;
        const eff = hasPromo && incrRev != null ? incrRev / w.spend : null;
        const incr = hasPromo ? w.incr_units ?? null : null;
        const val = metric === 'effectiveness' ? eff : incr;
        if (val != null) {
          if (val > 0) maxPos = Math.max(maxPos, val);
          else maxNeg = Math.max(maxNeg, Math.abs(val));
        }
        g.set(`${r.sku}__${w.week}`, {
          effectiveness: eff, incrUnits: incr,
          spend: w.spend, revenue: w.revenue,
          baseRevenue: w.base_revenue, incrementalRevenue: incrRev,
          qtyActual: w.qty_actual, qtyBase: w.qty_base,
        });
      });
    });

    // Band-level aggregates (median across SKUs per week)
    const agg: Record<string, Record<number, number | null>> = {};
    BAND_ORDER.filter((b) => map[b]?.length).forEach((band) => {
      agg[band] = {};
      weekList.forEach((wk) => {
        const vals = (map[band] ?? [])
          .map((r) => cellValue(g.get(`${r.sku}__${wk}`), metric))
          .filter((v): v is number => v != null);
        agg[band][wk] = median(vals);
      });
    });

    return { bandMap: map, weeks: weekList, grid: g, domPos: maxPos || 1, domNeg: maxNeg || 1, bandAgg: agg };
  }, [rows, weekly, metric]);

  const bands = BAND_ORDER.filter((b) => bandMap[b]?.length);
  if (!bands.length) return <p className="note" style={{ padding: 24 }}>{t('common.noData')}</p>;

  // Shared styles matching the Calendar tab visual language
  const skuLabelStyle: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 600, color: 'var(--ink)',
    background: 'var(--surface-2)', borderRadius: 3,
    padding: '4px 6px', whiteSpace: 'nowrap',
    overflow: 'hidden', textOverflow: 'ellipsis',
    position: 'sticky', left: 0, zIndex: 1,
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ padding: '14px 16px', overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: '2px', fontSize: 10.5, width: '100%', tableLayout: 'fixed' }}
          role="img" aria-label={t('charts.promoEffectivenessHeatmap')}>
          <colgroup>
            <col style={{ width: 140 }} />
          </colgroup>
          <thead>
            <tr>
              {/* empty header above SKU column */}
              <th style={{ position: 'sticky', left: 0, zIndex: 2, background: 'var(--surface)', fontSize: 0 }} />
              {weeks.map((wk) => (
                <th key={wk} style={{ fontSize: 8, color: 'var(--muted)', textAlign: 'center', padding: '2px 0', fontWeight: 400 }}>
                  {wk % 4 === 0 || wk === 1 ? wk : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bands.map((band) => {
              const isExpanded = expandedBands.has(band);
              const skuList = bandMap[band] ?? [];
              return (
                <>
                  {/* ── Band summary row — click to expand ── */}
                  <tr key={`band-${band}`} style={{ cursor: 'pointer' }} onClick={() => toggleBand(band)}>
                    <td style={{
                      ...skuLabelStyle,
                      background: 'var(--accent-soft)',
                      color: 'var(--accent)', fontSize: 11, fontWeight: 700,
                    }}>
                      <span style={{ marginRight: 5, fontSize: 9 }}>{isExpanded ? '▾' : '▸'}</span>
                      {BAND_LABELS[band] ?? band}
                      <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: 5, fontSize: 9 }}>
                        ({skuList.length})
                      </span>
                    </td>
                    {weeks.map((wk) => (
                      <td key={wk} style={{
                        height: 20, borderRadius: 2,
                        background: divergeColor(bandAgg[band]?.[wk] ?? null, domPos, domNeg),
                        transition: 'opacity 0.1s',
                      }} />
                    ))}
                  </tr>

                  {/* ── SKU rows — only when band is expanded ── */}
                  {isExpanded && skuList.map((r) => (
                    <tr key={r.sku}>
                      <td style={{ ...skuLabelStyle,
                        padding: '3px 10px 3px 24px',
                        fontSize: 10, color: 'var(--ink)', whiteSpace: 'nowrap',
                      }}>
                        {r.sku}
                      </td>
                      {weeks.map((wk) => {
                        const d = grid.get(`${r.sku}__${wk}`);
                        const val = cellValue(d, metric);
                        return (
                          <td key={wk}
                            onMouseEnter={(e) => d && setTooltip({ x: e.clientX, y: e.clientY, label: r.sku, week: wk, cell: d })}
                            onMouseLeave={() => setTooltip(null)}
                            style={{
                              height: 20, borderRadius: 2,
                              background: divergeColor(val, domPos, domNeg),
                              cursor: val != null ? 'pointer' : 'default',
                              transition: 'opacity 0.1s',
                            }}
                          />
                        );
                      })}
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 4px 4px', flexWrap: 'wrap', fontSize: 11, color: 'var(--body)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 90, height: 10, borderRadius: 3, background: 'linear-gradient(to right, var(--critical), var(--surface-2), var(--good))' }} />
          {metric === 'effectiveness' ? t('charts.lowerToHigherEffectiveness') : t('charts.lowerToHigherIncrementalUnits')}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: 'var(--surface-2)', border: '1px solid var(--line)' }} />
          {t('charts.noPromoThisWeek')}
        </span>
        <span style={{ color: 'var(--muted)', fontSize: 10 }}>{t('heatmap.bandRowIsMedian')}</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 10,
          background: '#213b55', color: '#fff', borderRadius: 6,
          padding: '8px 12px', fontSize: 11, pointerEvents: 'none', zIndex: 999, lineHeight: 1.7,
        }}>
          <b>{tooltip.label}</b> · W{tooltip.week}<br />
          {t('metrics.promoSpend')}: {formatKc(tooltip.cell.spend)} {currencySymbol}<br />
          {metric === 'effectiveness' ? (
            <>
              {t('charts.baselineValue')}: {formatKc(tooltip.cell.baseRevenue ?? 0)} {currencySymbol}<br />
              {t('charts.incrementalValue')}:{' '}
              {tooltip.cell.incrementalRevenue != null
                ? `${tooltip.cell.incrementalRevenue >= 0 ? '+' : ''}${formatKc(tooltip.cell.incrementalRevenue)} ${currencySymbol}`
                : '—'}<br />
              {t('metrics.promoEffectiveness')}:{' '}
              {tooltip.cell.effectiveness != null ? `${(1 + tooltip.cell.effectiveness).toFixed(2)}×` : t('charts.noPromoThisWeek')}
            </>
          ) : (
            <>
              {t('charts.baselineUnits')}: {formatKc(tooltip.cell.qtyBase ?? 0)}<br />
              {t('charts.actualUnits')}: {formatKc(tooltip.cell.qtyActual ?? 0)}<br />
              {t('metrics.incrementalUnits')}:{' '}
              {tooltip.cell.incrUnits != null
                ? `${tooltip.cell.incrUnits >= 0 ? '+' : ''}${formatKc(tooltip.cell.incrUnits)}`
                : t('charts.noPromoThisWeek')}
            </>
          )}
        </div>
      )}
    </div>
  );
});

HistoricalHeatmap.displayName = 'HistoricalHeatmap';

import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SimulationResponse } from '~/types/simulation';
import { niceTicks } from '~/components/Historical/chartUtils';

const QUARTER_WEEKS: Record<string, [number, number]> = {
  Q1: [1, 13], Q2: [14, 26], Q3: [27, 39], Q4: [40, 52],
};

interface Props {
  results: SimulationResponse;
  quarterFocus?: string[];
}

const SVG_H = 300;
const PAD = { top: 32, right: 16, bottom: 60, left: 68 };

function kpiNum(v: number) {
  return Math.round(v).toLocaleString('en-US');
}

// Stacked bar chart: base units (gray) + incremental units (green/red) per week
function StackedUnitsChart({
  weeks,
  base,
  incremental,
  label,
}: {
  weeks: number[];
  base: number[];
  incremental: number[];
  label: string;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(900);
  const [tip, setTip] = useState<null | {
    x: number; y: number; week: number; base: number; incr: number;
  }>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.getBoundingClientRect().width || 900);
    const obs = new ResizeObserver((e) => setW(e[0].contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const plotW = Math.max(w - PAD.left - PAD.right, 10);
  const plotH = SVG_H - PAD.top - PAD.bottom;

  const totals = base.map((b, i) => b + Math.max(incremental[i], 0));
  const mins   = base.map((b, i) => b + Math.min(incremental[i], 0));
  const yMax   = Math.max(...totals, 1);
  const yMin   = Math.min(...mins, 0);
  const yRange = yMax - yMin || 1;
  const yTicks = niceTicks(yMin, yMax, 5);

  const toY = (v: number) => PAD.top + plotH * (1 - (v - yMin) / yRange);
  const zeroY = toY(0);

  const n = weeks.length || 1;
  const slotW = plotW / n;
  const barW = Math.max(slotW * 0.8, 2);

  return (
    <div ref={ref} style={{ width: '100%' }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '.05em',
        padding: '10px 16px 4px',
      }}>
        {label}
      </div>
      <svg
        width={w} height={SVG_H}
        role="img" aria-label={label}
        onMouseLeave={() => setTip(null)}
      >
        {/* Gridlines + Y ticks */}
        {yTicks.map((tick) => {
          const y = toY(tick);
          return (
            <g key={tick}>
              <line x1={PAD.left} x2={PAD.left + plotW} y1={y} y2={y}
                stroke={tick === 0 ? 'var(--muted)' : 'var(--line)'}
                strokeWidth={tick === 0 ? 1.5 : 1} />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end"
                fontSize={10} fill="var(--chart-text,var(--muted))">
                {tick >= 1000 ? `${(tick / 1000).toFixed(0)}k` : tick}
              </text>
            </g>
          );
        })}

        {/* Y-axis label */}
        <text x={12} y={PAD.top + plotH / 2} textAnchor="middle"
          fontSize={10} fill="var(--chart-text,var(--muted))"
          transform={`rotate(-90,12,${PAD.top + plotH / 2})`}>
          {t('metrics.units')}
        </text>

        {/* Bars */}
        {weeks.map((wk, i) => {
          const cx = PAD.left + i * slotW + slotW / 2;
          const b = base[i] ?? 0;
          const incr = incremental[i] ?? 0;

          // base bar
          const baseTop = toY(b);
          const baseH = Math.max(zeroY - baseTop, 1);

          // incremental segment
          const incrPositive = incr >= 0;
          const incrTop    = incrPositive ? toY(b + incr) : zeroY;
          const incrBottom = incrPositive ? toY(b) : toY(b + incr);
          const incrH      = Math.max(incrBottom - incrTop, 1);
          const incrColor  = incrPositive
            ? 'var(--good, #1f8f5f)'
            : 'var(--critical, #b23b3b)';

          return (
            <g key={wk}
              onMouseEnter={(e) => setTip({ x: e.clientX, y: e.clientY, week: wk, base: b, incr })}
            >
              <rect x={cx - barW / 2} y={baseTop} width={barW} height={baseH}
                fill="var(--chart-grid, #e5e7eb)" rx={1} />
              <rect x={cx - barW / 2} y={incrTop} width={barW} height={incrH}
                fill={incrColor} opacity={0.85} rx={1} />
              <text x={cx} y={PAD.top + plotH + 10}
                fontSize={8} fill="var(--chart-text,var(--muted))"
                textAnchor="middle">
                {wk}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, padding: '4px 16px 10px', fontSize: 11, color: 'var(--body)', flexWrap: 'wrap' }}>
        {[
          ['var(--chart-grid,#e5e7eb)', t('volume.baselineUnits')],
          ['var(--good,#1f8f5f)', t('volume.incrUnitsPositive')],
          ['var(--critical,#b23b3b)', t('volume.incrUnitsNegative')],
        ].map(([color, lbl]) => (
          <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: color }} />
            {lbl}
          </span>
        ))}
      </div>

      {/* Tooltip */}
      {tip && (
        <div style={{
          position: 'fixed', left: tip.x + 12, top: tip.y - 10,
          background: '#213b55', color: '#fff', borderRadius: 6,
          padding: '8px 12px', fontSize: 11, pointerEvents: 'none',
          zIndex: 999, lineHeight: 1.7,
        }}>
          <b>{t('volume.weekLabel', { week: tip.week })}</b><br />
          {t('volume.baselineUnits')}: {kpiNum(tip.base)}<br />
          {t('volume.incrementalUnits')}: {tip.incr >= 0 ? '+' : ''}{kpiNum(tip.incr)}<br />
          {t('volume.totalUnits')}: {kpiNum(tip.base + tip.incr)}
        </div>
      )}
    </div>
  );
}

export const VolumeTab = memo(({ results, quarterFocus = [] }: Props) => {
  const { t } = useTranslation();
  const [scope, setScope] = useState<'portfolio' | 'sku'>('portfolio');
  const [selSku, setSelSku] = useState<string>('');

  const u = results.weekly_chart_units;

  if (!u) {
    return <p className="note" style={{ padding: 24 }}>{t('common.noData')}</p>;
  }

  // Apply quarter filter — keep week if any selected quarter contains it.
  // Empty selection = show all 52 weeks.
  const weekIndices = u.weeks.reduce<number[]>((acc, w, i) => {
    const show = quarterFocus.length === 0 || quarterFocus.some((q) => {
      const [lo, hi] = QUARTER_WEEKS[q] ?? [1, 52];
      return w >= lo && w <= hi;
    });
    if (show) acc.push(i);
    return acc;
  }, []);
  const weeks   = weekIndices.map((i) => u.weeks[i]);
  const base    = weekIndices.map((i) => u.base[i]);
  const optimal = weekIndices.map((i) => u.optimal[i]);
  const per_sku = Object.fromEntries(
    Object.entries(u.per_sku).map(([sku, d]) => [sku, {
      ...d,
      base:    weekIndices.map((i) => d.base[i]),
      optimal: weekIndices.map((i) => d.optimal[i]),
    }])
  );
  const skus = Object.keys(per_sku).sort();

  // Auto-select first SKU when switching to SKU scope
  const handleScope = (s: 'portfolio' | 'sku') => {
    setScope(s);
    if (s === 'sku' && !selSku && skus[0]) setSelSku(skus[0]);
  };

  // Active base/optimal arrays depend on scope
  const activeBase    = scope === 'sku' && selSku ? per_sku[selSku].base    : base;
  const activeOptimal = scope === 'sku' && selSku ? per_sku[selSku].optimal : optimal;
  const activeIncr    = weeks.map((_, i) => (activeOptimal[i] ?? 0) - (activeBase[i] ?? 0));

  const totalBase = activeBase.reduce((s, v) => s + v, 0);
  const totalOpt  = activeOptimal.reduce((s, v) => s + v, 0);
  const totalIncr = totalOpt - totalBase;
  const liftPct   = totalBase > 0 ? (totalIncr / totalBase) * 100 : 0;

  return (
    <div style={{ padding: '0 4px' }}>
      {/* KPI strip — 2 metrics only, update with scope/SKU */}
      <div style={{
        display: 'flex', gap: 32, flexWrap: 'wrap',
        padding: '14px 16px 10px',
        background: 'var(--surface-2,#f7f9fc)',
        borderBottom: '1px solid var(--line)',
        fontSize: 12,
      }}>
        {[
          { label: t('volume.totalIncrementalUnits'), value: `${totalIncr >= 0 ? '+' : ''}${kpiNum(totalIncr)}`, good: totalIncr >= 0 },
          { label: t('metrics.incrementalLift'),      value: `${liftPct >= 0 ? '+' : ''}${liftPct.toFixed(1)}%`, good: liftPct >= 0 },
        ].map(({ label, value, good }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)', fontWeight: 700 }}>
              {label}
            </span>
            <b style={{
              fontSize: 15, fontVariantNumeric: 'tabular-nums',
              color: good ? 'var(--good,#1f8f5f)' : 'var(--critical,#b23b3b)',
            }}>
              {value}
            </b>
          </div>
        ))}
      </div>

      {/* Toolbar: toggle + SKU selector on a fixed-height row.
          The SKU dropdown is always rendered (visibility:hidden when not in use)
          so the chart position never shifts when switching scope. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', height: 52 }}>
        <div className="seg" role="group" aria-label={t('volume.viewScope')}>
          <button
            type="button"
            className={scope === 'portfolio' ? 'active' : ''}
            onClick={() => handleScope('portfolio')}
          >
            {t('volume.portfolio')}
          </button>
          <button
            type="button"
            className={scope === 'sku' ? 'active' : ''}
            onClick={() => handleScope('sku')}
          >
            {t('volume.perSku')}
          </button>
        </div>

        {/* Always in DOM, hidden when not in SKU mode — prevents chart from shifting */}
        <select
          value={selSku}
          onChange={(e) => setSelSku(e.target.value)}
          style={{
            visibility: scope === 'sku' ? 'visible' : 'hidden',
            height: 32, padding: '0 9px', fontSize: 12,
            border: '1px solid var(--line)', borderRadius: 7,
            background: 'var(--surface)', color: 'var(--body)', cursor: 'pointer',
          }}
        >
          {skus.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Chart — uses activeBase/activeIncr which already reflect scope + selSku */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', margin: '8px 0' }}>
        <StackedUnitsChart
          weeks={weeks}
          base={activeBase}
          incremental={activeIncr}
          label={scope === 'sku' && selSku
            ? `${selSku} — ${t('volume.skuChartLabel')}`
            : t('volume.portfolioChartLabel')}
        />
      </div>
    </div>
  );
});

VolumeTab.displayName = 'VolumeTab';

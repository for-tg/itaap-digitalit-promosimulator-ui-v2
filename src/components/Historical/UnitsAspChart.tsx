import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { PortfolioRow, WeeklyRow } from '~/types/historical';
import { niceTicks } from './chartUtils';

interface Props {
  rows: PortfolioRow[];
  weekly: Record<string, WeeklyRow[]>;
  year: number;
  currencySymbol?: string;
}

const BANDS = ['LRTB', 'MRTB', 'HRTB'];
const PANEL_H = 190;
const PAD = { top: 20, right: 52, bottom: 32, left: 58 };

// Convert ISO week number to abbreviated month label for the x-axis
const MONTH_STARTS: Array<[number, string]> = [
  [1, 'Jan'], [5, 'Feb'], [9, 'Mar'], [14, 'Apr'],
  [18, 'May'], [22, 'Jun'], [27, 'Jul'], [31, 'Aug'],
  [36, 'Sep'], [40, 'Oct'], [44, 'Nov'], [48, 'Dec'],
];

function weekLabel(week: number, year: number): string {
  for (let i = MONTH_STARTS.length - 1; i >= 0; i--) {
    if (week >= MONTH_STARTS[i][0]) return `${MONTH_STARTS[i][1]} ${String(year).slice(2)}`;
  }
  return '';
}

function fmtK(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return String(Math.round(v));
}

interface BandData {
  band: string;
  weeks: number[];
  units: number[];   // total QtyActual across SKUs per week
  asp: (number | null)[];  // weighted avg sell-out ASP per week
}

function Panel({
  data, year, currencySymbol,
}: {
  data: BandData; year: number; currencySymbol: string;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  const [tip, setTip] = useState<null | {
    x: number; y: number; week: number; units: number; asp: number | null;
  }>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.getBoundingClientRect().width || 800);
    const obs = new ResizeObserver((e) => setW(e[0].contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const plotW = Math.max(w - PAD.left - PAD.right, 10);
  const plotH = PANEL_H - PAD.top - PAD.bottom;

  const validAsp = data.asp.filter((v): v is number => v != null);
  const maxUnits = Math.max(...data.units, 1);
  const minAsp = validAsp.length ? Math.min(...validAsp) : 0;
  const maxAsp = validAsp.length ? Math.max(...validAsp) : 1;

  const uTicks = niceTicks(0, maxUnits, 4);
  const uMax = uTicks[uTicks.length - 1] || 1;
  const aTicks = niceTicks(minAsp * 0.9, maxAsp * 1.1, 4);
  const aMin = aTicks[0] || 0;
  const aMax = aTicks[aTicks.length - 1] || 1;

  const toX = (i: number) => PAD.left + (i / Math.max(data.weeks.length - 1, 1)) * plotW;
  const toUY = (v: number) => PAD.top + plotH * (1 - v / uMax);
  const toAY = (v: number) => PAD.top + plotH * (1 - (v - aMin) / (aMax - aMin || 1));

  // Build area path for units
  const areaPath = data.units.map((v, i) => {
    const x = toX(i), y = toUY(v);
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(' ') + ` L ${toX(data.units.length - 1)} ${PAD.top + plotH} L ${toX(0)} ${PAD.top + plotH} Z`;

  // Build ASP line segments (skip nulls)
  const aspSegments: string[] = [];
  let seg = '';
  data.asp.forEach((v, i) => {
    if (v == null) { if (seg) { aspSegments.push(seg); seg = ''; } return; }
    const x = toX(i), y = toAY(v);
    seg += seg ? ` L ${x} ${y}` : `M ${x} ${y}`;
  });
  if (seg) aspSegments.push(seg);

  // Month tick positions
  const xTicks: Array<{ x: number; label: string }> = [];
  let lastLabel = '';
  data.weeks.forEach((wk, i) => {
    const lbl = weekLabel(wk, year);
    if (lbl !== lastLabel) { xTicks.push({ x: toX(i), label: lbl }); lastLabel = lbl; }
  });

  return (
    <div ref={ref} style={{ display: 'flex', alignItems: 'stretch', marginBottom: 4 }}>
      {/* Vertical band label */}
      <div style={{
        width: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          transform: 'rotate(-90deg)', whiteSpace: 'nowrap',
          fontSize: 11, fontWeight: 800, letterSpacing: '.04em',
          color: data.band === 'LRTB' ? 'var(--band-l,#0a5fb4)' :
                 data.band === 'MRTB' ? 'var(--band-m,#178f88)' : 'var(--band-h,#7a5cc4)',
        }}>
          {data.band}
        </span>
      </div>

      {/* SVG chart */}
      <svg width={w - 22} height={PANEL_H}
        onMouseLeave={() => setTip(null)}
        style={{ display: 'block' }}
      >
        {/* Gridlines + left ticks (units) */}
        {uTicks.map((tick) => {
          const y = toUY(tick);
          return (
            <g key={`u-${tick}`}>
              <line x1={PAD.left} x2={PAD.left + plotW} y1={y} y2={y}
                stroke="var(--chart-grid,#e5e7eb)" strokeWidth={1} />
              <text x={PAD.left - 5} y={y + 4} textAnchor="end"
                fontSize={9} fill="var(--chart-text,var(--muted))">
                {fmtK(tick)}
              </text>
            </g>
          );
        })}

        {/* Right ticks (ASP) */}
        {aTicks.map((tick) => {
          const y = toAY(tick);
          return (
            <text key={`a-${tick}`} x={PAD.left + plotW + 4} y={y + 4}
              textAnchor="start" fontSize={9}
              fill="var(--chart-metric-pos,#c05a00)">
              {currencySymbol}{tick.toFixed(0)}
            </text>
          );
        })}

        {/* Left axis label */}
        <text x={12} y={PAD.top + plotH / 2} textAnchor="middle"
          fontSize={9} fill="var(--chart-text,var(--muted))"
          transform={`rotate(-90,12,${PAD.top + plotH / 2})`}>
          Units
        </text>

        {/* Right axis label */}
        <text x={PAD.left + plotW + 44} y={PAD.top + plotH / 2} textAnchor="middle"
          fontSize={9} fill="var(--chart-metric-pos,#c05a00)"
          transform={`rotate(90,${PAD.left + plotW + 44},${PAD.top + plotH / 2})`}>
          ASP
        </text>

        {/* Blue area — units */}
        <path d={areaPath} fill="var(--chart-line-spend,#2f8de4)" fillOpacity={0.25} />
        <path d={data.units.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toUY(v)}`).join(' ')}
          fill="none" stroke="var(--chart-line-spend,#2f8de4)" strokeWidth={1.5} />

        {/* Orange line — ASP */}
        {aspSegments.map((d, i) => (
          <path key={i} d={d} fill="none"
            stroke="#e06c00" strokeWidth={2} strokeLinejoin="round" />
        ))}

        {/* X-axis labels (month) */}
        {xTicks.map(({ x, label }) => (
          <text key={label} x={x} y={PAD.top + plotH + 20}
            textAnchor="middle" fontSize={9} fill="var(--chart-text,var(--muted))">
            {label}
          </text>
        ))}

        {/* Baseline */}
        <line x1={PAD.left} x2={PAD.left + plotW}
          y1={PAD.top + plotH} y2={PAD.top + plotH}
          stroke="var(--muted)" strokeWidth={1} />

        {/* Hover hit-zones */}
        {data.weeks.map((wk, i) => (
          <rect key={wk}
            x={toX(i) - plotW / data.weeks.length / 2}
            y={PAD.top} width={plotW / data.weeks.length} height={plotH}
            fill="transparent"
            onMouseEnter={(e) => setTip({
              x: e.clientX, y: e.clientY,
              week: wk, units: data.units[i], asp: data.asp[i],
            })}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {tip && (
        <div style={{
          position: 'fixed', left: tip.x + 12, top: tip.y - 10,
          background: '#213b55', color: '#fff', borderRadius: 6,
          padding: '7px 11px', fontSize: 11, pointerEvents: 'none', zIndex: 999, lineHeight: 1.7,
        }}>
          <b>W{tip.week}</b><br />
          {t('charts.actualUnits')}: {fmtK(tip.units)}<br />
          ASP: {tip.asp != null ? `${currencySymbol}${tip.asp.toFixed(2)}` : '—'}
        </div>
      )}
    </div>
  );
}

export const UnitsAspChart = memo(({
  rows, weekly, year, currencySymbol = '',
}: Props) => {
  const { t } = useTranslation();

  // Group SKUs by band and aggregate per week
  const bandData: BandData[] = useMemo(() => {
    const bandSkus: Record<string, string[]> = {};
    rows.forEach((r) => {
      const b = BANDS.includes(r.band) ? r.band : null;
      if (!b) return;
      if (!bandSkus[b]) bandSkus[b] = [];
      bandSkus[b].push(r.sku);
    });

    // Union of weeks across all SKUs
    const weekSet = new Set<number>();
    rows.forEach((r) => weekly[r.sku]?.forEach((w) => weekSet.add(w.week)));
    const weekList = Array.from(weekSet).sort((a, b) => a - b);

    return BANDS.filter((b) => bandSkus[b]?.length).map((band) => {
      const skus = bandSkus[band] ?? [];
      const units: number[] = [];
      const asp: (number | null)[] = [];

      weekList.forEach((wk) => {
        let totalUnits = 0;
        let totalRevASP = 0; // sum(price * qty)
        let totalQtyForASP = 0;

        skus.forEach((sku) => {
          const row = weekly[sku]?.find((r) => r.week === wk);
          if (!row) return;
          const qty = row.qty_actual ?? 0;
          totalUnits += qty;
          if (row.avg_price != null && qty > 0) {
            totalRevASP += row.avg_price * qty;
            totalQtyForASP += qty;
          }
        });

        units.push(totalUnits);
        asp.push(totalQtyForASP > 0 ? totalRevASP / totalQtyForASP : null);
      });

      return { band, weeks: weekList, units, asp };
    });
  }, [rows, weekly]);

  if (!bandData.length) {
    return <p className="note" style={{ padding: 24 }}>{t('common.noData')}</p>;
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex', gap: 18, padding: '8px 16px 4px', flexWrap: 'wrap',
        fontSize: 11, color: 'var(--body)',
      }}>
        {[
          ['var(--chart-line-spend,#2f8de4)', t('metrics.units')],
          ['#e06c00', `ASP (${currencySymbol})`],
        ].map(([color, lbl]) => (
          <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 24, height: 3, borderRadius: 2, background: color }} />
            {lbl}
          </span>
        ))}
      </div>

      {bandData.map((d) => (
        <Panel key={d.band} data={d} year={year} currencySymbol={currencySymbol} />
      ))}
    </div>
  );
});

UnitsAspChart.displayName = 'UnitsAspChart';

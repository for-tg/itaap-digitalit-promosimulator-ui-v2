import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { HistoricalTotals, PortfolioRow } from '~/types/historical';
import { niceTicks, formatKc } from './chartUtils';

interface VolumeUpliftChartProps {
  rows: PortfolioRow[];
  totals?: HistoricalTotals;
  currencySymbol?: string;
}

const SVG_HEIGHT    = 320;
const PAD = { top: 44, right: 24, bottom: 90, left: 80 };

// Returns bar fill colour based on promo ROI efficiency thresholds
function roiColor(roi: number): string {
  if (roi >= 0) return 'var(--chart-good, #1f8f5f)';
  if (roi >= -0.2) return 'var(--chart-warn, #d2a028)';
  return 'var(--chart-bad, #b23b3b)';
}

// Promo volume uplift bar chart — incremental units per SKU, coloured by ROI efficiency.
export const VolumeUpliftChart = memo(({
  rows,
  totals,
  currencySymbol = '',
}: VolumeUpliftChartProps) => {

  console.log('VolumeUpliftChart currencySymbol:', currencySymbol);
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgWidth, setSvgWidth]     = useState(900);
  const [tooltip, setTooltip]       = useState<null | {
    x: number; y: number; sku: string; band: string; units: number;
    spend: number; roi: number;
  }>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setSvgWidth(el.getBoundingClientRect().width || 900);
    const observer = new ResizeObserver((entries) => setSvgWidth(entries[0].contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const enriched = rows.map((r) => ({
    ...r,
    incr_units: r.incr_units ?? 0,
    incremental: r.incremental ?? (r.spend * r.return_per_kc),
  }));

  const rowsSpend = enriched.reduce((s, r) => s + r.spend, 0);
  const rowsUnits = enriched.reduce((s, r) => s + r.incr_units, 0);
  const rowsIncr = enriched.reduce((s, r) => s + r.incremental, 0);

  // KPI strip should reflect API-level totals when available.
  const totalSpend = totals?.spend ?? rowsSpend;
  const totalUnits = totals?.incremental_units ?? rowsUnits;
  const totalIncr = totals?.incremental ?? rowsIncr;
  const costPerUnit = totalUnits > 0 ? totalSpend / totalUnits : 0;
  const overallRoi = totalSpend > 0 ? totalIncr / totalSpend : 0;

  const plotWidth  = Math.max(svgWidth - PAD.left - PAD.right, 10);
  const plotHeight = SVG_HEIGHT - PAD.top - PAD.bottom;

  const maxUnits = Math.max(...enriched.map((r) => r.incr_units), 1);
  const minUnits = Math.min(...enriched.map((r) => r.incr_units), 0);
  const yTicks   = niceTicks(Math.min(minUnits, 0), maxUnits, 5);
  const yMin     = yTicks[0];
  const yMax     = yTicks[yTicks.length - 1];
  const yRange   = yMax - yMin || 1;

  const rowCount  = enriched.length || 1;
  const slotW     = plotWidth / rowCount;
  const barW      = Math.max(slotW * 0.72 - 1, 3);
  const zeroY     = PAD.top + plotHeight * (yMax / yRange);

  const toY = (v: number) => PAD.top + plotHeight * (1 - (v - yMin) / yRange);

  const bandShort: Record<string, string> = { LRTB: 'L', MRTB: 'M', HRTB: 'H' };

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {/* Headline KPI strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap',
        padding: '10px 12px', background: 'var(--surface-2, #f7f9fc)',
        borderBottom: '1px solid var(--line)', fontSize: 12,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)', fontWeight: 700 }}>{t('metrics.promoSpend')}</span>
          <b style={{ fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
            {formatKc(totalSpend)} {currencySymbol}
          </b>
        </div>

        <span style={{ fontSize: 18, color: 'var(--muted)' }}>→</span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)', fontWeight: 700 }}>{t('metrics.incrementalUnits')}</span>
          <b style={{ fontSize: 15, color: 'var(--good, #1f8f5f)', fontVariantNumeric: 'tabular-nums' }}>
            {totalUnits >= 0 ? '+' : ''}{totalUnits.toLocaleString('en-US')}
          </b>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)', fontWeight: 700 }}>{t('charts.costPerUnit')}</span>
          <b style={{ fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
            {costPerUnit > 0
              ? `${Math.round(costPerUnit).toLocaleString('en-US')} ${currencySymbol}`
              : '—'}
          </b>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)', fontWeight: 700 }}>{t('optimizedView.deepDive.table.promoRoi')}</span>
          <b style={{ fontSize: 15, color: overallRoi >= 0 ? 'var(--good, #1f8f5f)' : 'var(--critical, #b23b3b)', fontVariantNumeric: 'tabular-nums' }}>
            {(overallRoi * 100).toFixed(0)}%
          </b>
        </div>
      </div>

      {/* SVG chart */}
      <svg
        width={svgWidth}
        height={SVG_HEIGHT}
        aria-label={t('charts.promoVolumeUpliftBySku')}
        role="img"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Y-axis gridlines + tick labels */}
        {yTicks.map((tick) => {
          const y = toY(tick);
          return (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotWidth}
                y1={y}
                y2={y}
                stroke={tick === 0 ? 'var(--muted)' : 'var(--line)'}
                strokeWidth={tick === 0 ? 1.5 : 1}
              />
              <text
                x={PAD.left - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={10}
                fill="var(--chart-text, var(--muted))"
              >
                {tick.toLocaleString('en-US')}
              </text>
            </g>
          );
        })}

        {/* Y-axis label */}
        <text
          x={14}
          y={PAD.top + plotHeight / 2}
          textAnchor="middle"
          fontSize={10}
          fill="var(--chart-text, var(--muted))"
          transform={`rotate(-90, 14, ${PAD.top + plotHeight / 2})`}
        >
          {t('charts.incrUnitsNoPromo')}
        </text>

        {/* Bars + X labels */}
        {enriched.map((row, i) => {
          const cx   = PAD.left + i * slotW + slotW / 2;
          const barH = Math.abs(toY(row.incr_units) - zeroY);
          const barY = row.incr_units >= 0 ? toY(row.incr_units) : zeroY;
          const color = roiColor(row.return_per_kc);
          const label = `${row.sku} (${bandShort[row.band] ?? row.band})`;

          return (
            <g
              key={row.sku}
              onMouseEnter={(e) => setTooltip({
                x: e.clientX,
                y: e.clientY,
                sku: row.sku,
                band: row.band,
                units: row.incr_units,
                spend: row.spend,
                roi: row.return_per_kc,
              })}
            >
              <rect
                x={cx - barW / 2}
                y={barY}
                width={barW}
                height={Math.max(barH, 1)}
                fill={color}
                opacity={0.85}
                rx={1}
              />

              {/* Rotated SKU label */}
              <text
                x={cx}
                y={PAD.top + plotHeight + 6}
                fontSize={9}
                fill="var(--chart-text, var(--muted))"
                textAnchor="end"
                transform={`rotate(-45, ${cx}, ${PAD.top + plotHeight + 6})`}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Zero line (solid) */}
        <line
          x1={PAD.left}
          x2={PAD.left + plotWidth}
          y1={zeroY}
          y2={zeroY}
          stroke="var(--muted)"
          strokeWidth={1.5}
        />
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '4px 12px 12px', flexWrap: 'wrap', fontSize: 11, color: 'var(--body)' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'rgba(31,143,95,.8)', marginRight: 6 }} />{t('charts.roiPositive')}</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'rgba(210,160,40,.8)', marginRight: 6 }} />{t('charts.marginal')}</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'rgba(178,59,59,.8)', marginRight: 6 }} />{t('charts.inefficient')}</span>
        <span style={{ marginLeft: 8, color: 'var(--muted)', fontSize: 10 }}>{t('charts.bandShownOnXAxis')}</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 12,
          top: tooltip.y - 10,
          background: '#213b55',
          color: '#fff',
          borderRadius: 6,
          padding: '8px 12px',
          fontSize: 11,
          pointerEvents: 'none',
          zIndex: 999,
          lineHeight: 1.6,
        }}>
          <b>{tooltip.sku}</b> ({tooltip.band})<br />
          {t('charts.incrUnits')}: {tooltip.units.toLocaleString('en-US')}<br />
          {t('metrics.promoSpend')}: {formatKc(tooltip.spend)} {currencySymbol}<br />
          {t('optimizedView.deepDive.table.promoRoi')}: {(tooltip.roi * 100).toFixed(0)}%
        </div>
      )}
    </div>
  );
});

VolumeUpliftChart.displayName = 'VolumeUpliftChart';
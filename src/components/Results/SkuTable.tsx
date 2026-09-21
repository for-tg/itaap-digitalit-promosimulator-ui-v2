import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { niceTicks, formatKc } from '~/components/Historical/chartUtils';
import type {
  SkuTableRow,
  WeeklyChart as WeeklyChartData,
} from '~/types/simulation';

interface Props {
  rows: SkuTableRow[];
  weeklyChart: WeeklyChartData;
  objective: string;
}

const PAGE_SIZE = 10;
const fmt = (v: number | null) =>
  v != null ? Math.round(v).toLocaleString('en-US') : '--';
const roiFmt = (v: number | null) => (v != null ? `${v.toFixed(2)}x` : '--');

function roiColor(roi: number | null): string {
  if (roi == null) return 'var(--muted)';
  if (roi >= 0) return 'rgba(31,143,95,.82)';
  if (roi >= -0.2) return 'rgba(210,160,40,.82)';
  return 'rgba(178,59,59,.82)';
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'good' | 'bad';
}) {
  const color =
    accent === 'good'
      ? 'var(--good,#1f8f5f)'
      : accent === 'bad'
        ? 'var(--critical,#b23b3b)'
        : 'var(--ink)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        style={{
          fontSize: 9.5,
          textTransform: 'uppercase',
          letterSpacing: '.05em',
          color: 'var(--muted)',
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <b style={{ fontSize: 15, fontVariantNumeric: 'tabular-nums', color }}>
        {value}
      </b>
    </div>
  );
}

function OptVolumeUpliftChart({ rows }: { rows: SkuTableRow[] }) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgWidth, setSvgWidth] = useState(800);
  const [tooltip, setTooltip] = useState<null | {
    x: number;
    y: number;
    row: SkuTableRow;
    units: number;
  }>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    setSvgWidth(el.getBoundingClientRect().width || 800);
    const obs = new ResizeObserver((entries) =>
      setSvgWidth(entries[0].contentRect.width)
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // incr_units is a placeholder until backend returns explicit values.
  const sorted = [...rows].sort(
    (a, b) => (b.incr_units ?? b.gain) - (a.incr_units ?? a.gain)
  );
  const enriched = sorted.map((r) => ({
    ...r,
    _units: r.incr_units ?? Math.round(Math.abs(r.gain) / 350),
  }));

  const totalSpend = enriched.reduce((sum, r) => sum + r.promo_spend, 0);
  const totalUnits = enriched.reduce((sum, r) => sum + r._units, 0);
  const costPerUnit = totalUnits > 0 ? totalSpend / totalUnits : 0;
  const totalIncr = enriched.reduce((sum, r) => sum + r.gain, 0);
  const overallRoi = totalSpend > 0 ? totalIncr / totalSpend : 0;

  const SVG_H = 300;
  const PAD = { top: 40, right: 20, bottom: 88, left: 80 };
  const plotW = Math.max(svgWidth - PAD.left - PAD.right, 10);
  const plotH = SVG_H - PAD.top - PAD.bottom;

  const maxUnits = Math.max(...enriched.map((r) => r._units), 1);
  const yTicks = niceTicks(0, maxUnits, 5);
  const yMax = yTicks[yTicks.length - 1];
  const slotW = plotW / (enriched.length || 1);
  const barW = Math.max(slotW * 0.72 - 1, 3);
  const toY = (v: number) => PAD.top + plotH * (1 - v / yMax);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          flexWrap: 'wrap',
          padding: '10px 14px',
          background: 'var(--surface-2,#f7f9fc)',
          borderBottom: '1px solid var(--line)',
          fontSize: 12,
        }}
      >
        <Kpi
          label={t('charts.optSpend')}
          value={`${formatKc(totalSpend)} `} // need to ad dynamic currency
        />
        <span style={{ fontSize: 18, color: 'var(--muted)' }}>-&gt;</span>
        <Kpi
          label={t('metrics.incrementalUnits')}
          value={`${totalUnits >= 0 ? '+' : ''}${totalUnits.toLocaleString('en-US')}`}
          accent="good"
        />
        <Kpi
          label={t('charts.costPerUnit')}
          value={
            costPerUnit > 0
              ? `${Math.round(costPerUnit).toLocaleString('en-US')} `
              : '--'
          }
        />
        <Kpi
          label={t('optimizedView.deepDive.table.promoRoi')}
          value={`${(overallRoi * 100).toFixed(0)}%`}
          accent={overallRoi >= 0 ? 'good' : 'bad'}
        />
      </div>

      <svg
        width={svgWidth}
        height={SVG_H}
        aria-label={t('charts.optVolumeUplift')}
        role="img"
        onMouseLeave={() => setTooltip(null)}
      >
        {yTicks.map((tick) => {
          const y = toY(tick);
          return (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y}
                y2={y}
                stroke="var(--line)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={10}
                fill="var(--chart-text,var(--muted))"
              >
                {tick.toLocaleString('en-US')}
              </text>
            </g>
          );
        })}

        <text
          x={14}
          y={PAD.top + plotH / 2}
          textAnchor="middle"
          fontSize={10}
          fill="var(--chart-text,var(--muted))"
          transform={`rotate(-90,14,${PAD.top + plotH / 2})`}
        >
          {t('charts.incrUnitsRecommended')}
        </text>

        {enriched.map((r, i) => {
          const cx = PAD.left + i * slotW + slotW / 2;
          const barY = toY(r._units);
          const barH = Math.max(plotH - (barY - PAD.top), 1);

          return (
            <g
              key={r.sku}
              onMouseEnter={(e) =>
                setTooltip({
                  x: e.clientX,
                  y: e.clientY,
                  row: r,
                  units: r._units,
                })
              }
            >
              <rect
                x={cx - barW / 2}
                y={barY}
                width={barW}
                height={barH}
                fill={roiColor(r.roi)}
                rx={1}
              />
              <text
                x={cx}
                y={PAD.top + plotH + 6}
                fontSize={9}
                fill="var(--chart-text,var(--muted))"
                textAnchor="end"
                transform={`rotate(-45,${cx},${PAD.top + plotH + 6})`}
              >
                {r.sku}
              </text>
            </g>
          );
        })}

        <line
          x1={PAD.left}
          x2={PAD.left + plotW}
          y1={PAD.top + plotH}
          y2={PAD.top + plotH}
          stroke="var(--muted)"
          strokeWidth={1.5}
        />
      </svg>

      <div
        style={{
          display: 'flex',
          gap: 14,
          padding: '4px 14px 12px',
          flexWrap: 'wrap',
          fontSize: 11,
          color: 'var(--body)',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            color: 'var(--muted)',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.04em',
          }}
        >
          {t('charts.bar')}
        </span>
        {(
          [
            ['rgba(31,143,95,.82)', t('charts.roiPositive')],
            ['rgba(210,160,40,.82)', t('charts.marginal')],
            ['rgba(178,59,59,.82)', t('charts.inefficient')],
          ] as [string, string][]
        ).map(([color, label]) => (
          <span key={label}>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: 2,
                background: color,
                marginRight: 6,
                verticalAlign: 'middle',
              }}
            />
            {label}
          </span>
        ))}
      </div>

      {tooltip && (
        <div
          style={{
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
          }}
        >
          <b>{tooltip.row.sku}</b>
          <br />
          {t('charts.incrUnits')}: {tooltip.units.toLocaleString('en-US')}
          <br />
          {t('optimizedView.deepDive.table.optimalSpend')}:{' '}
          {formatKc(tooltip.row.promo_spend)} 
          <br />
          {t('optimizedView.deepDive.table.promoRoi')}:{' '}
          {tooltip.row.roi != null
            ? `${(tooltip.row.roi * 100).toFixed(0)}%`
            : '--'}
        </div>
      )}
    </div>
  );
}

export const SkuTable = ({ rows, objective }: Props) => {
  const { t } = useTranslation();
  const metricLabel =
    objective === 'turnover' ? t('metrics.revenue') : t('metrics.profit');

  const sorted = [...rows].sort((a, b) => b.gain - a.gain);
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          marginBottom: 14,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '13px 16px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            {t('charts.optVolumeUplift')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
            {t('charts.incrUnitsVsActual', { count: rows.length })}
          </div>
        </div>
        <OptVolumeUpliftChart rows={rows} />
      </div>

      <div className="deepdive-wrap">
        <div className="dd-header">
          <div className="dd-title">{t('optimizedView.deepDive.title')}</div>
          <div className="dd-subtitle-row">
            <div className="dd-subtitle">
              {t('optimizedView.deepDive.subtitle')}
            </div>
            <div className="dd-tooltip-container">
              <span className="dd-info-btn">i</span>
              <div className="dd-tooltip">
                {t('optimizedView.deepDive.description')}
              </div>
            </div>
          </div>
          <hr className="dd-divider" />
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('optimizedView.deepDive.table.sku')}</th>
                <th>
                  {t('optimizedView.deepDive.baseMetric', {
                    metric: metricLabel,
                  })}
                </th>
                <th>
                  {t('optimizedView.deepDive.actualMetric', {
                    metric: metricLabel,
                  })}
                </th>
                <th>
                  {t('optimizedView.deepDive.optimalMetric', {
                    metric: metricLabel,
                  })}
                </th>
                <th>{t('optimizedView.deepDive.table.gainVsActual')}</th>
                <th>{t('optimizedView.deepDive.table.actualSpend')}</th>
                <th>{t('optimizedView.deepDive.table.optimalSpend')}</th>
                <th>{t('optimizedView.deepDive.table.promoRoi')}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.sku}>
                  <td className="sku-cell">{row.sku}</td>
                  <td className="tnum">{fmt(row.base_profit)}</td>
                  <td className="tnum">{fmt(row.act_profit)}</td>
                  <td className="tnum">{fmt(row.opt_profit)}</td>
                  <td className={`tnum ${row.gain >= 0 ? 'gain' : 'loss'}`}>
                    {row.gain >= 0 ? '+' : ''}
                    {fmt(row.gain)}
                  </td>
                  <td className="tnum">{fmt(row.act_promo_spend)}</td>
                  <td className="tnum">{fmt(row.promo_spend)}</td>
                  <td className="tnum roi-cell">
                    {roiFmt(row.roi)}{' '}
                    <span className="roi-vs">
                      {t('optimizedView.deepDive.vs')} {roiFmt(row.act_roi)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="dd-pagination">
            <button
              className="dd-page-btn"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              &lsaquo;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`dd-page-btn ${p === page ? 'dd-page-active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              className="dd-page-btn"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              &rsaquo;
            </button>
            <span className="dd-page-info">
              {t('descriptions.selectedOfTotal', {
                selected: `${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, sorted.length)}`,
                total: sorted.length,
              })}
            </span>
          </div>
        )}
      </div>
    </>
  );
};

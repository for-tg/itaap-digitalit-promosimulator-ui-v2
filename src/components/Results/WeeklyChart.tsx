import { useTranslation } from 'react-i18next';

import type { ElasticMetric, ElasticScope } from '~/contexts/SimulatorContext';

/* ── Types ── */
interface ElasticityData {
  series: Record<string, Array<{ week: number; median: number; min: number; max: number }>>;
  depth_curves_profit: Record<string, Array<{ discount: number; median: number; min: number; max: number }>>;
  depth_curves_revenue: Record<string, Array<{ discount: number; median: number; min: number; max: number }>>;
  weeks: number[];
  obj_label: string;
  sku_list?: string[];
  pooled?: {
    depth_profit?: Array<{ discount: number; median: number; min: number; max: number }>;
    depth_revenue?: Array<{ discount: number; median: number; min: number; max: number }>;
    beta_weekly?: Array<{ week: number; median: number; min: number; max: number }>;
  };
  per_sku?: Record<
    string,
    {
      depth_profit?: Array<{ discount: number; median: number; min: number; max: number }>;
      depth_revenue?: Array<{ discount: number; median: number; min: number; max: number }>;
      beta_weekly?: Array<{ week: number; value: number }>;
    }
  >;
}

interface Props {
  elasticity: ElasticityData;
  selectedSkus: string[];
  metric: ElasticMetric;
  setMetric: (m: ElasticMetric) => void;
  scope: ElasticScope;
  setScope: (s: ElasticScope) => void;
  skuSel: string | null;
  setSkuSel: (s: string | null) => void;
  maximized: 'depth' | 'beta' | null;
  setMaximized: (v: 'depth' | 'beta' | null) => void;
}

/* ── Aggregation helpers ── */
const avgAcross = <T extends { median: number; min: number; max: number }>(
  skuArrays: T[][],
): Array<{ median: number; min: number; max: number }> => {
  if (!skuArrays.length) return [];
  const len = skuArrays[0].length;
  return Array.from({ length: len }, (_, i) => {
    const vals = skuArrays.map((a) => a[i] ?? { median: 0, min: 0, max: 0 });
    const median = vals.reduce((s, v) => s + v.median, 0) / vals.length;
    const min    = vals.reduce((s, v) => s + v.min, 0)    / vals.length;
    const max    = vals.reduce((s, v) => s + v.max, 0)    / vals.length;
    return { median, min, max };
  });
};

/* ── Tiny SVG line chart ── */
interface ChartPt { label: string; median: number; min?: number; max?: number; }

interface SvgLineChartProps {
  data: ChartPt[];
  color: string;
  bandColor: string;
  yLabel: string;
  showBand?: boolean;
}

const MARGIN = { top: 16, right: 14, bottom: 36, left: 52 };
const H = 210;

function niceRange(min: number, max: number, nTicks = 5): { lo: number; hi: number; step: number } {
  const raw = (max - min) / (nTicks - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  return { lo, hi, step };
}

const SvgLineChart = ({ data, color, bandColor, yLabel, showBand = false }: SvgLineChartProps) => {
  const { t } = useTranslation();
  if (!data.length) return <div className="e-no-data">{t('common.noData')}</div>;

  const w = 560;
  const innerW = w - MARGIN.left - MARGIN.right;
  const innerH = H - MARGIN.top - MARGIN.bottom;

  const medians = data.map((d) => d.median);
  const allVals = showBand
    ? [...medians, ...data.map((d) => d.min ?? 0), ...data.map((d) => d.max ?? 0)]
    : medians;
  const dataMin = Math.min(0, ...allVals);
  const dataMax = Math.max(...allVals, 0.01);
  const { lo, hi, step } = niceRange(dataMin, dataMax, 5);

  const xOf = (i: number) =>
    MARGIN.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
  const yOf = (v: number) => MARGIN.top + innerH - ((v - lo) / (hi - lo)) * innerH;

  /* paths */
  const medPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i)},${yOf(d.median)}`).join(' ');
  const bandPath = showBand
    ? [
        ...data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i)},${yOf(d.max ?? d.median)}`),
        ...[...data].reverse().map((d, ri) =>
          `L${xOf(data.length - 1 - ri)},${yOf(d.min ?? d.median)}`
        ),
        'Z',
      ].join(' ')
    : '';

  /* y ticks */
  const yTicks: number[] = [];
  for (let v = lo; v <= hi + step * 0.01; v += step) yTicks.push(parseFloat(v.toFixed(6)));

  /* x tick sampling: show up to ~12 labels */
  const xStep = Math.max(1, Math.ceil(data.length / 12));

  /* dot radius — only for small datasets */
  const dotR = data.length <= 25 ? 2.5 : 0;

  return (
    <svg
      viewBox={`0 0 ${w} ${H}`}
      width="100%"
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden
    >
      {/* grid lines */}
      {yTicks.map((v) => (
        <line key={v} x1={MARGIN.left} x2={w - MARGIN.right}
          y1={yOf(v)} y2={yOf(v)} stroke="var(--line)" strokeWidth={0.8} />
      ))}
      {/* zero line */}
      {lo < 0 && hi > 0 && (
        <line x1={MARGIN.left} x2={w - MARGIN.right}
          y1={yOf(0)} y2={yOf(0)} stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 2" />
      )}

      {/* band fill */}
      {showBand && bandPath && (
        <path d={bandPath} fill={bandColor} />
      )}

      {/* median line */}
      <path d={medPath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {/* dots */}
      {dotR > 0 && data.map((d, i) => (
        <circle key={i} cx={xOf(i)} cy={yOf(d.median)} r={dotR}
          fill={color} stroke="var(--surface)" strokeWidth={1}>
          <title>{`${d.label}: ${d.median.toFixed(2)}`}</title>
        </circle>
      ))}

      {/* y-axis labels */}
      {yTicks.map((v) => (
        <text key={v} x={MARGIN.left - 6} y={yOf(v) + 4}
          textAnchor="end" fontSize={9} fill="var(--muted)">
          {Math.abs(v) < 1 && v !== 0 ? v.toFixed(1) : v % 1 === 0 ? v : v.toFixed(1)}
        </text>
      ))}

      {/* y-axis rotated label */}
      <text
        x={0} y={0}
        transform={`translate(11, ${MARGIN.top + innerH / 2}) rotate(-90)`}
        textAnchor="middle" fontSize={9} fill="var(--muted)"
      >
        {yLabel}
      </text>

      {/* x-axis labels */}
      {data.map((d, i) => {
        if (i % xStep !== 0) return null;
        return (
          <text key={i} x={xOf(i)} y={H - MARGIN.bottom + 14}
            textAnchor="middle" fontSize={9} fill="var(--muted)">
            {d.label}
          </text>
        );
      })}

      {/* axes */}
      <line x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={H - MARGIN.bottom}
        stroke="var(--line)" strokeWidth={1} />
      <line x1={MARGIN.left} x2={w - MARGIN.right} y1={H - MARGIN.bottom} y2={H - MARGIN.bottom}
        stroke="var(--line)" strokeWidth={1} />
    </svg>
  );
};

/* ── Main elasticity panel ── */
export const WeeklyChart = ({
  elasticity,
  selectedSkus,
  metric, setMetric,
  scope, setScope,
  skuSel, setSkuSel,
  maximized, setMaximized,
}: Props) => {
  const seriesKeys = Object.keys(elasticity.series);
  const perSkuKeys = Object.keys(elasticity.per_sku ?? {});
  const resultSkus = elasticity.sku_list && elasticity.sku_list.length > 0
    ? elasticity.sku_list
    : [...new Set([...perSkuKeys, ...seriesKeys])];
  const skus = resultSkus.length > 0
    ? (selectedSkus.length > 0
        ? selectedSkus.filter((sku) => resultSkus.includes(sku))
        : resultSkus)
    : selectedSkus;
  const { t } = useTranslation();

  const activeSku = scope === 'sku'
    ? ((skuSel && skus.includes(skuSel)) ? skuSel : (skus[0] ?? null))
    : null;

  const getPerSkuDepth = (sku: string, selectedMetric: ElasticMetric) => {
    const skuData = elasticity.per_sku?.[sku];
    if (!skuData) return null;
    return selectedMetric === 'profit' ? (skuData.depth_profit ?? null) : (skuData.depth_revenue ?? null);
  };

  const getPerSkuWeekly = (sku: string) => {
    const skuData = elasticity.per_sku?.[sku];
    if (!skuData?.beta_weekly) return null;
    return skuData.beta_weekly.map((p) => ({
      week: p.week,
      median: p.value,
      min: p.value,
      max: p.value,
    }));
  };

  const skuDepthData = activeSku ? getPerSkuDepth(activeSku, metric) : null;
  const skuWeeklyData = activeSku ? getPerSkuWeekly(activeSku) : null;
  const skuLegacyDepth = activeSku
    ? (metric === 'profit' ? elasticity.depth_curves_profit[activeSku] : elasticity.depth_curves_revenue[activeSku])
    : undefined;
  const skuLegacyWeekly = activeSku ? elasticity.series[activeSku] : undefined;
  const depthHasSkuData = scope === 'sku' && activeSku !== null && Boolean(
    (skuDepthData && skuDepthData.length > 0)
    || (skuLegacyDepth && skuLegacyDepth.length > 0)
  );
  const betaHasSkuData = scope === 'sku' && activeSku !== null && Boolean(
    (skuWeeklyData && skuWeeklyData.length > 0)
    || (skuLegacyWeekly && skuLegacyWeekly.length > 0)
  );

  /* ── Depth response data ── */
  const depthCurves = metric === 'profit'
    ? elasticity.depth_curves_profit
    : elasticity.depth_curves_revenue;

  const depthPts: ChartPt[] = (() => {
    // Single SKU mode: prefer per_sku data, then legacy keyed depth curves.
    if (scope === 'sku' && activeSku) {
      const points = skuDepthData ?? skuLegacyDepth;
      if (points && points.length > 0) {
        return points.map((p) => ({ label: `${p.discount}%`, median: p.median, min: p.min, max: p.max }));
      }
    }

    // All-selected mode: prefer pooled curve if present.
    const pooledDepth = metric === 'profit'
      ? elasticity.pooled?.depth_profit
      : elasticity.pooled?.depth_revenue;
    if (pooledDepth && pooledDepth.length > 0) {
      return pooledDepth.map((p) => ({ label: `${p.discount}%`, median: p.median, min: p.min, max: p.max }));
    }

    const keys = Object.keys(depthCurves);
    if (!keys.length) return [];
    const avg = avgAcross(keys.map((k) => depthCurves[k]));
    const ref = depthCurves[keys[0]];
    return avg.map((p, i) => ({ label: `${ref[i]?.discount ?? i}%`, ...p }));
  })();

  /* ── Weekly β data ── */
  const betaPts: ChartPt[] = (() => {
    // Single SKU mode: prefer per_sku weekly values, then legacy keyed series.
    if (scope === 'sku' && activeSku) {
      const points = skuWeeklyData ?? skuLegacyWeekly;
      if (points && points.length > 0) {
        return points.map((p) => ({ label: `W${p.week}`, median: p.median, min: p.min, max: p.max }));
      }
    }

    // All-selected mode: prefer pooled weekly curve if present.
    if (elasticity.pooled?.beta_weekly && elasticity.pooled.beta_weekly.length > 0) {
      return elasticity.pooled.beta_weekly.map((p) => ({
        label: `W${p.week}`,
        median: p.median,
        min: p.min,
        max: p.max,
      }));
    }

    const keys = Object.keys(elasticity.series);
    if (!keys.length) return [];
    const avg = avgAcross(keys.map((k) => elasticity.series[k]));
    const ref = elasticity.series[keys[0]];
    return avg.map((p, i) => ({ label: `W${ref[i]?.week ?? i + 1}`, ...p }));
  })();
  const depthNoDataNote = scope === 'sku' && activeSku && !depthHasSkuData;
  const betaNoDataNote = scope === 'sku' && activeSku && !betaHasSkuData;
  const metricLabel = metric === 'profit' ? t('optimizedView.elasticity.profitUplift') : t('optimizedView.elasticity.revenueUplift');
  const scopeLabel = scope === 'all' ? t('optimizedView.elasticity.allSelectedSkus') : (activeSku ?? '');

  // Depth response and weekly β charts removed per Satyam feedback (2026-09-16).
  // The elasticity tab will be replaced by an SKU × Week heat map (task 2).
  // Data computation below is preserved so the heat map can reuse it.
  const showDepth = false;
  const showBeta  = false;

  /* ── Shared scope controls ── */
  const ScopeControls = () => (
    <>
      <div className="seg">
        <button className={scope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>
          {t('optimizedView.elasticity.allSelected')}
        </button>
        <button className={scope === 'sku' ? 'active' : ''} onClick={() => setScope('sku')}>
          {t('optimizedView.elasticity.singleSku')}
        </button>
      </div>
      {scope === 'sku' && skus.length > 0 && (
        <select className="metric-select" value={activeSku ?? ''} onChange={(e) => setSkuSel(e.target.value)}>
          {skus.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}
    </>
  );

  const MetricControl = () => (
    <select
      className="metric-select"
      value={metric}
      onChange={(e) => setMetric(e.target.value as ElasticMetric)}
    >
      <option value="profit">{t('optimizedView.elasticity.profitUplift')}</option>
      <option value="revenue">{t('optimizedView.elasticity.revenueUplift')}</option>
    </select>
  );

  return (
    <div className={`elastic-2col${maximized ? ' maximized' : ''}`}>

      {/* ── Panel 1: Depth response ── */}
      {showDepth && (
        <div className="e-panel">
          <div className="e-panel-head">
            <div>
              <div className="e-title">{t('optimizedView.elasticity.discountDepthResponse')}</div>
              <div className="e-subtitle">
                {t('optimizedView.elasticity.depthResponseSubtitle', {
                  metric: metricLabel,
                  scope: scopeLabel,
                })}
              </div>
            </div>
          </div>
          <div className="e-controls">
            <MetricControl />
            <ScopeControls />
            <button
              className="maximize-btn"
              onClick={() => setMaximized(maximized === 'depth' ? null : 'depth')}
              aria-label={maximized === 'depth' ? t('actions.restore') : t('actions.maximize')}
              title={maximized === 'depth' ? t('actions.restore') : t('actions.maximize')}
            >
              {maximized === 'depth' ? '🗗' : '🗖'}
            </button>
          </div>
          {depthNoDataNote && (
            <div className="e-no-data-inline">No individual data — showing portfolio average</div>
          )}
          <div className="e-chart-wrap">
            <SvgLineChart
              data={depthPts}
              color="var(--accent)"
              bandColor="rgba(10,95,180,.12)"
              yLabel={t('optimizedView.elasticity.upliftAxisLabel', { metric: metricLabel })}
              showBand={false}
            />
          </div>
          <div className="e-x-label">{t('optimizedView.calendar.discountDepth')}</div>
          <div className="e-note">
            {t('optimizedView.elasticity.discountDepthFooterWithMetric', { metric: metricLabel })}
          </div>
        </div>
      )}

      {/* ── Panel 2: Weekly |β| ── */}
      {showBeta && (
        <div className="e-panel">
          <div className="e-panel-head">
            <div>
              <div className="e-title">{t('optimizedView.elasticity.weeklyPriceElasticity')}</div>
              <div className="e-subtitle">
                {t('optimizedView.elasticity.weeklyElasticitySubtitle', { scope: scopeLabel })}
              </div>
            </div>
          </div>
          <div className="e-controls">
            <MetricControl />
            <ScopeControls />
            <button
              className="maximize-btn"
              onClick={() => setMaximized(maximized === 'beta' ? null : 'beta')}
              aria-label={maximized === 'beta' ? t('actions.restore') : t('actions.maximize')}
              title={maximized === 'beta' ? t('actions.restore') : t('actions.maximize')}
            >
              {maximized === 'beta' ? '🗗' : '🗖'}
            </button>
          </div>
          {betaNoDataNote && (
            <div className="e-no-data-inline">No individual data — showing portfolio average</div>
          )}
          <div className="e-chart-wrap">
            <SvgLineChart
              data={betaPts}
              color="var(--band-h, #7a5cc4)"
              bandColor="rgba(122,92,196,.12)"
              yLabel={t('optimizedView.elasticity.priceElasticityAxisLabel')}
              showBand
            />
          </div>
          <div className="e-note">
            {scope === 'all'
              ? t('optimizedView.elasticity.weeklyElasticityFooter')
              : t('optimizedView.elasticity.weeklyElasticityFooterSku', { sku: activeSku })}
          </div>
        </div>
      )}

    </div>
  );
};



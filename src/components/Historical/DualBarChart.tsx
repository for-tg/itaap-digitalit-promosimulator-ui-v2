import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { PortfolioRow } from '~/types/historical';
import { METRIC_LABELS, METRIC_AXIS_LABELS } from '~/constants/simulator';
import { niceTicks, formatKc, formatDecimal } from './chartUtils';

interface DualBarChartProps {
  rows: PortfolioRow[];
  secondary: string;
}

const SVG_HEIGHT   = 360;
const CHART_PADDING = { top: 50, right: 95, bottom: 88, left: 110 };

// Portfolio dual-axis bar chart: promo spend (left axis) vs. selected metric (right axis)
export const DualBarChart = memo(({ rows, secondary }: DualBarChartProps) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgWidth, setSvgWidth] = useState(900);
  const [tooltip, setTooltip] = useState<{
    sku: string; x: number; y: number; type: 'spend' | 'metric'; value: number;
  } | null>(null);

  // Track container width for responsive SVG sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setSvgWidth(el.getBoundingClientRect().width || 900);
    const observer = new ResizeObserver((entries) => setSvgWidth(entries[0].contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const plotWidth  = Math.max(svgWidth - CHART_PADDING.left - CHART_PADDING.right, 10);
  const plotHeight = SVG_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  const spendValues  = rows.map((row) => row.spend);
  const metricValues = rows.map((row) => (row as unknown as Record<string, number>)[secondary] ?? 0);

  const maxSpend    = Math.max(...spendValues, 1);
  const minMetric   = Math.min(...metricValues, 0);
  const maxMetric   = Math.max(...metricValues, 0.01);
  const metricRange = Math.max(maxMetric - minMetric, 0.01);
  const metricScale = plotHeight / metricRange;

  const zeroLineY          = CHART_PADDING.top + plotHeight * (maxMetric / metricRange);
  const positiveAreaHeight = zeroLineY - CHART_PADDING.top;

  const spendTicks  = niceTicks(0, maxSpend, 5);
  const metricTicks = niceTicks(minMetric, maxMetric, 6);

  const rowCount   = rows.length || 1;
  const slotWidth  = plotWidth / rowCount;
  const groupWidth = slotWidth * 0.78;
  const barWidth   = Math.max((groupWidth / 2) - 1, 3);

  const secondaryLabel = secondary === 'return_per_kc'
    ? t('metrics.returnPerKc')
    : METRIC_LABELS[secondary] ?? secondary;
  const secondaryAxisLabel = secondary === 'return_per_kc'
    ? t('charts.returnAxis')
    : METRIC_AXIS_LABELS[secondary] ?? secondary;
  const isSmallScale   = Math.abs(maxMetric) < 10;
  const spendColor     = 'var(--chart-spend)';
  const metricNegColor = 'var(--chart-metric-neg)';
  const metricPosColor = 'var(--chart-metric-pos)';

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg width={svgWidth} height={SVG_HEIGHT} aria-label={t('charts.portfolioChart')} role="img">
        {/* Legend — centered */}
        <rect x={svgWidth / 2 - 106} y={6} width={11} height={11} fill={metricNegColor} rx={2} />
        <text x={svgWidth / 2 - 92} y={16} fontSize={11} fill="var(--chart-text)">{secondaryLabel}</text>
        <rect x={svgWidth / 2 + 10} y={6} width={11} height={11} fill={spendColor} rx={2} />
        <text x={svgWidth / 2 + 24} y={16} fontSize={11} fill="var(--chart-text)">{t('metrics.promoSpend')}</text>

        {/* Chart background */}
        <rect x={CHART_PADDING.left} y={CHART_PADDING.top} width={plotWidth} height={plotHeight}
          fill="var(--chart-surface)" rx={2} />

        {/* Horizontal gridlines at left-axis tick positions */}
        {spendTicks.map((tickValue) => {
          const tickY = zeroLineY - (tickValue / maxSpend) * positiveAreaHeight;
          if (tickY < CHART_PADDING.top - 1 || tickY > CHART_PADDING.top + plotHeight + 1) return null;
          return (
            <line key={tickValue}
              x1={CHART_PADDING.left} x2={CHART_PADDING.left + plotWidth} y1={tickY} y2={tickY}
              stroke="var(--chart-grid)" strokeWidth={1} />
          );
        })}

        {/* Zero baseline */}
        <line x1={CHART_PADDING.left} x2={CHART_PADDING.left + plotWidth} y1={zeroLineY} y2={zeroLineY}
          stroke="var(--chart-axis)" strokeWidth={1.5} />

        {/* SKU bar groups */}
        {rows.map((row, rowIndex) => {
          const groupLeft    = CHART_PADDING.left + rowIndex * slotWidth + slotWidth * 0.11;
          const metricValue  = (row as unknown as Record<string, number>)[secondary] ?? 0;
          const groupCenterX = groupLeft + groupWidth / 2;

          const spendBarHeight = (row.spend / maxSpend) * positiveAreaHeight;
          const spendBarTop    = zeroLineY - spendBarHeight;

          let metricBarTop: number, metricBarHeight: number;
          if (metricValue >= 0) {
            metricBarHeight = metricValue * metricScale;
            metricBarTop    = zeroLineY - metricBarHeight;
          } else {
            metricBarHeight = Math.abs(metricValue) * metricScale;
            metricBarTop    = zeroLineY;
          }

          return (
            <g key={row.sku} onMouseLeave={() => setTooltip(null)}>
              {/* Spend bar */}
              <rect x={groupLeft} y={spendBarTop} width={barWidth} height={Math.max(spendBarHeight, 1)}
                fill={spendColor} rx={1} style={{ cursor: 'crosshair' }}
                onMouseEnter={() => setTooltip({ sku: row.sku, x: groupCenterX, y: spendBarTop, type: 'spend', value: row.spend })}
              />
              {/* Metric bar */}
              <rect x={groupLeft + barWidth + 1} y={metricBarTop} width={barWidth} height={Math.max(metricBarHeight, 1)}
                fill={metricValue >= 0 ? metricPosColor : metricNegColor} rx={1} style={{ cursor: 'crosshair' }}
                onMouseEnter={() => setTooltip({ sku: row.sku, x: groupCenterX, y: metricBarTop, type: 'metric', value: metricValue })}
              />
              {/* SKU name label rotated 45° so all names fit */}
              <text x={groupCenterX} y={CHART_PADDING.top + plotHeight + 8}
                textAnchor="end" fontSize={8.5} fill="var(--chart-label)"
                transform={`rotate(-45 ${groupCenterX} ${CHART_PADDING.top + plotHeight + 8})`}>
                {row.sku}
              </text>
            </g>
          );
        })}

        {/* Left Y-axis line */}
        <line x1={CHART_PADDING.left} x2={CHART_PADDING.left}
          y1={CHART_PADDING.top} y2={CHART_PADDING.top + plotHeight} stroke="var(--chart-border)" />

        {/* Left Y-axis ticks and labels (promo spend) */}
        {spendTicks.map((tickValue) => {
          const tickY = zeroLineY - (tickValue / maxSpend) * positiveAreaHeight;
          if (tickY < CHART_PADDING.top - 3 || tickY > CHART_PADDING.top + plotHeight + 3) return null;
          return (
            <g key={tickValue}>
              <line x1={CHART_PADDING.left - 4} x2={CHART_PADDING.left} y1={tickY} y2={tickY} stroke="var(--chart-axis)" />
              <text x={CHART_PADDING.left - 7} y={tickY + 4} fontSize={10} fill="var(--chart-text)" textAnchor="end">
                {formatKc(tickValue)}
              </text>
            </g>
          );
        })}
        {/* Left axis title */}
        <text x={16} y={CHART_PADDING.top + plotHeight / 2} fontSize={10} fill="var(--chart-text)" textAnchor="middle"
          transform={`rotate(-90 16 ${CHART_PADDING.top + plotHeight / 2})`}>
          {t('charts.promoSpendAxis')}
        </text>

        {/* Right Y-axis line */}
        <line x1={CHART_PADDING.left + plotWidth} x2={CHART_PADDING.left + plotWidth}
          y1={CHART_PADDING.top} y2={CHART_PADDING.top + plotHeight} stroke="var(--chart-border)" />

        {/* Right Y-axis ticks and labels (secondary metric) */}
        {metricTicks.map((tickValue) => {
          const tickY = CHART_PADDING.top + plotHeight * (maxMetric - tickValue) / metricRange;
          if (tickY < CHART_PADDING.top - 3 || tickY > CHART_PADDING.top + plotHeight + 3) return null;
          return (
            <g key={tickValue}>
              <line x1={CHART_PADDING.left + plotWidth} x2={CHART_PADDING.left + plotWidth + 4}
                y1={tickY} y2={tickY} stroke="var(--chart-axis)" />
              <text x={CHART_PADDING.left + plotWidth + 7} y={tickY + 4} fontSize={10} fill="var(--chart-text)" textAnchor="start">
                {isSmallScale ? formatDecimal(tickValue) : formatKc(tickValue)}
              </text>
            </g>
          );
        })}
        {/* Right axis title */}
        <text x={svgWidth - 16} y={CHART_PADDING.top + plotHeight / 2} fontSize={10} fill="var(--chart-text)" textAnchor="middle"
          transform={`rotate(90 ${svgWidth - 16} ${CHART_PADDING.top + plotHeight / 2})`}>
          {secondaryAxisLabel}
        </text>

        {/* Hover tooltip */}
        {tooltip && (() => {
          const isSpendBar       = tooltip.type === 'spend';
          const tooltipLabel     = isSpendBar ? t('metrics.promoSpend') : secondaryLabel;
          const tooltipValue     = isSpendBar ? formatKc(tooltip.value) : formatDecimal(tooltip.value);
          const tooltipColor     = isSpendBar ? spendColor : (tooltip.value >= 0 ? metricPosColor : metricNegColor);
          const tooltipBoxWidth  = 170;
          const tooltipBoxHeight = 44;
          let tooltipX = tooltip.x + 10;
          let tooltipY = tooltip.y - tooltipBoxHeight - 6;
          if (tooltipX + tooltipBoxWidth > svgWidth - 4) tooltipX = tooltip.x - tooltipBoxWidth - 10;
          if (tooltipX < 4) tooltipX = 4;
          if (tooltipY < 4) tooltipY = tooltip.y + 6;
          return (
            <g style={{ pointerEvents: 'none' }}>
              <rect x={tooltipX} y={tooltipY} width={tooltipBoxWidth} height={tooltipBoxHeight}
                rx={4} fill="rgba(25,25,25,0.92)" />
              <text x={tooltipX + 9} y={tooltipY + 14} fontSize={10} fontWeight="bold" fill="white">
                {tooltip.sku}
              </text>
              <rect x={tooltipX + 9} y={tooltipY + 21} width={8} height={8} fill={tooltipColor} rx={2} />
              <text x={tooltipX + 21} y={tooltipY + 30} fontSize={9.5} fill="#d0d0d0">
                {tooltipLabel}: {tooltipValue}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
});
DualBarChart.displayName = 'DualBarChart';

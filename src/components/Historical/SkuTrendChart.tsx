import { memo, useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { WeeklyRow } from '~/types/historical';
import { METRIC_LABELS } from '~/constants/simulator';
import { niceTicks, formatKc, formatDecimal, smoothCubicPath } from './chartUtils';
import styles from '~/screens/SimulatorScreen/stages/HistoricalStage/styles.module.css';

interface SkuTrendChartProps {
  rows: WeeklyRow[];
  secondary: string;
  currencySymbol?: string;
}

const SVG_HEIGHT = 300;
const PLOT_HEIGHT = 222;
const PAD_LEFT = 110;
const PAD_TOP = 30;

// SKU weekly trend line chart: promo spend vs. secondary metric over calendar weeks
export const SkuTrendChart = memo(({
  rows,
  secondary,
  currencySymbol = '',
}: SkuTrendChartProps) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgWidth, setSvgWidth] = useState(900);

  // Track container width for responsive SVG sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    setSvgWidth(el.getBoundingClientRect().width || 900);

    const observer = new ResizeObserver((entries) =>
      setSvgWidth(entries[0].contentRect.width)
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  // Fill gaps so every week 1..maxWeek has a data point (zero-fill missing weeks)
  const denseWeeks = useMemo(() => {
    if (rows.length === 0) return [];

    const weekMap = new Map<number, WeeklyRow>();

    for (const row of rows) {
      weekMap.set(row.week, row);
    }

    const maxWeek = Math.max(
      52,
      ...rows.map((row) => row.week)
    );

    const filledRows: WeeklyRow[] = [];

    for (let week = 1; week <= maxWeek; week++) {
      const existing = weekMap.get(week);

      filledRows.push(
        existing ?? {
          week,
          spend: 0,
          revenue: 0,
          profit: 0,
          return_per_kc: 0,
        }
      );
    }

    return filledRows;
  }, [rows]);

  if (denseWeeks.length === 0) {
    return (
      <p className={styles.note}>
        {t('charts.noWeeklyDataAvailable')}
      </p>
    );
  }

  const isRoiMetric = secondary === 'return_per_kc';
  const isDualAxis =
    isRoiMetric || secondary === 'incr_units';

  const metricLabels: Record<string, string> = {
    return_per_kc: t('metrics.returnPerKc'),
    revenue: t('metrics.revenue'),
    profit: t('metrics.profit'),
  };

  const secondaryLabel =
    metricLabels[secondary] ??
    METRIC_LABELS[secondary] ??
    secondary;

  const spendValues = denseWeeks.map(
    (row) => row.spend
  );

  const metricValues = denseWeeks.map((row) => {
    const value =
      (row as unknown as Record<string, number>)[secondary] ?? 0;

    return isRoiMetric ? value * 100 : value;
  });

  const padRight = isDualAxis ? 72 : 20;

  const plotWidth = Math.max(
    svgWidth - PAD_LEFT - padRight,
    10
  );

  // Render every other week label on dense 52-week charts
  const weekLabelStep =
    denseWeeks.length > 26 ? 2 : 1;

  // Maps a week index to its SVG x coordinate
  const xPosition = (index: number) =>
    PAD_LEFT +
    (index / Math.max(denseWeeks.length - 1, 1)) *
      plotWidth;

  if (isDualAxis) {
    // Dual-axis mode: spend on left, secondary metric on right
    const spendAxisMax =
      Math.max(...spendValues, 1) * 1.05;

    const rawReturnMin =
      Math.min(...metricValues, 0);

    const rawReturnMax =
      Math.max(...metricValues, 0.01);

    const returnPadding =
      (rawReturnMax - rawReturnMin) * 0.08 || 0.1;

    const returnAxisMin =
      rawReturnMin - returnPadding;

    const returnAxisMax =
      rawReturnMax + returnPadding;

    const returnAxisRange =
      returnAxisMax - returnAxisMin;

    // Converts a spend value to its SVG y coordinate
    const toSpendY = (value: number) =>
      PAD_TOP +
      PLOT_HEIGHT *
        (1 - value / spendAxisMax);

    // Converts a secondary metric value to its SVG y coordinate
    const toReturnY = (value: number) =>
      PAD_TOP +
      PLOT_HEIGHT *
        (1 -
          (value - returnAxisMin) /
            returnAxisRange);

    const spendAxisTicks =
      niceTicks(0, spendAxisMax, 8);

    const returnAxisTicks =
      niceTicks(
        returnAxisMin,
        returnAxisMax,
        10
      );

    const spendPoints: [number, number][] =
      denseWeeks.map((row, index) => [
        xPosition(index),
        toSpendY(row.spend),
      ]);

    const metricPoints: [number, number][] =
      denseWeeks.map((_, index) => [
        xPosition(index),
        toReturnY(metricValues[index]),
      ]);

    return (
      <div
        ref={containerRef}
        style={{ width: '100%' }}
      >
        <svg
          width={svgWidth}
          height={SVG_HEIGHT}
        >
          {/* Legend */}
          <rect
            x={svgWidth - padRight - 195}
            y={8}
            width={11}
            height={11}
            fill="var(--chart-line-spend)"
            rx={2}
          />

          <text
            x={svgWidth - padRight - 181}
            y={17}
            fontSize={11}
            fill="var(--chart-text)"
          >
            {t('metrics.promoSpend')}
          </text>

          <rect
            x={svgWidth - padRight - 100}
            y={8}
            width={11}
            height={11}
            fill="var(--chart-line-metric)"
            rx={2}
          />

          <text
            x={svgWidth - padRight - 86}
            y={17}
            fontSize={11}
            fill="var(--chart-text)"
          >
            {secondaryLabel}
          </text>

          {/* Horizontal gridlines */}
          {spendAxisTicks.map((tickValue) => {
            const tickY = toSpendY(tickValue);

            if (
              tickY < PAD_TOP - 1 ||
              tickY >
                PAD_TOP +
                  PLOT_HEIGHT +
                  1
            ) {
              return null;
            }

            return (
              <line
                key={tickValue}
                x1={PAD_LEFT}
                x2={PAD_LEFT + plotWidth}
                y1={tickY}
                y2={tickY}
                stroke="var(--chart-grid)"
                strokeWidth={1}
              />
            );
          })}

          {/* Spend and secondary metric smooth lines */}
          <path
            d={smoothCubicPath(spendPoints)}
            fill="none"
            stroke="var(--chart-line-spend)"
            strokeWidth={2.5}
          />

          <path
            d={smoothCubicPath(metricPoints)}
            fill="none"
            stroke="var(--chart-line-metric)"
            strokeWidth={2.5}
          />

          {/* X-axis with week labels */}
          <line
            x1={PAD_LEFT}
            x2={PAD_LEFT + plotWidth}
            y1={PAD_TOP + PLOT_HEIGHT}
            y2={PAD_TOP + PLOT_HEIGHT}
            stroke="var(--chart-border)"
          />

          {denseWeeks.map((row, index) => {
            if (
              index % weekLabelStep !== 0
            ) {
              return null;
            }

            return (
              <text
                key={row.week}
                x={xPosition(index)}
                y={
                  PAD_TOP +
                  PLOT_HEIGHT +
                  16
                }
                fontSize={9}
                fill="var(--chart-label)"
                textAnchor="middle"
              >
                W{row.week}
              </text>
            );
          })}

          {/* Left Y-axis (spend) */}
          <line
            x1={PAD_LEFT}
            x2={PAD_LEFT}
            y1={PAD_TOP}
            y2={PAD_TOP + PLOT_HEIGHT}
            stroke="var(--chart-border)"
          />

          {spendAxisTicks.map((tickValue) => {
            const tickY = toSpendY(tickValue);

            if (
              tickY < PAD_TOP - 3 ||
              tickY >
                PAD_TOP +
                  PLOT_HEIGHT +
                  3
            ) {
              return null;
            }

            return (
              <g key={tickValue}>
                <line
                  x1={PAD_LEFT - 4}
                  x2={PAD_LEFT}
                  y1={tickY}
                  y2={tickY}
                  stroke="var(--chart-axis)"
                />

                <text
                  x={PAD_LEFT - 7}
                  y={tickY + 4}
                  fontSize={10}
                  fill="var(--chart-text)"
                  textAnchor="end"
                >
                  {formatKc(tickValue)}
                </text>
              </g>
            );
          })}

          <text
            x={20}
            y={
              PAD_TOP +
              PLOT_HEIGHT / 2
            }
            fontSize={10}
            fill="var(--chart-text)"
            textAnchor="middle"
            transform={`rotate(-90 20 ${
              PAD_TOP +
              PLOT_HEIGHT / 2
            })`}
          >
            {t('metrics.promoSpend')}
            {currencySymbol
              ? ` (${currencySymbol})`
              : ''}
          </text>

          {/* Right Y-axis */}
          <line
            x1={PAD_LEFT + plotWidth}
            x2={PAD_LEFT + plotWidth}
            y1={PAD_TOP}
            y2={PAD_TOP + PLOT_HEIGHT}
            stroke="var(--chart-border)"
          />

          {returnAxisTicks.map(
            (tickValue) => {
              const tickY =
                toReturnY(tickValue);

              if (
                tickY < PAD_TOP - 3 ||
                tickY >
                  PAD_TOP +
                    PLOT_HEIGHT +
                    3
              ) {
                return null;
              }

              return (
                <g key={tickValue}>
                  <line
                    x1={
                      PAD_LEFT +
                      plotWidth
                    }
                    x2={
                      PAD_LEFT +
                      plotWidth +
                      4
                    }
                    y1={tickY}
                    y2={tickY}
                    stroke="var(--chart-axis)"
                  />

                  <text
                    x={
                      PAD_LEFT +
                      plotWidth +
                      7
                    }
                    y={tickY + 4}
                    fontSize={10}
                    fill="var(--chart-text)"
                    textAnchor="start"
                  >
                    {isRoiMetric
                      ? `${formatDecimal(
                          tickValue
                        )}%`
                      : formatDecimal(
                          tickValue
                        )}
                  </text>
                </g>
              );
            }
          )}

          <text
            x={svgWidth - 18}
            y={
              PAD_TOP +
              PLOT_HEIGHT / 2
            }
            fontSize={10}
            fill="var(--chart-text)"
            textAnchor="middle"
            transform={`rotate(90 ${
              svgWidth - 18
            } ${
              PAD_TOP +
              PLOT_HEIGHT / 2
            })`}
          >
            {secondaryLabel}
          </text>
        </svg>
      </div>
    );
  }

  // Single-axis mode: spend and metric on shared currency scale
  const allValues = [
    ...spendValues,
    ...metricValues,
  ];

  const sharedAxisMax =
    Math.max(...allValues, 1) * 1.05;

  const toSharedY = (value: number) =>
    PAD_TOP +
    PLOT_HEIGHT *
      (1 - value / sharedAxisMax);

  const sharedAxisTicks =
    niceTicks(0, sharedAxisMax, 8);

  const spendPoints: [number, number][] =
    denseWeeks.map((row, index) => [
      xPosition(index),
      toSharedY(row.spend),
    ]);

  const metricPoints: [number, number][] =
    denseWeeks.map((_, index) => [
      xPosition(index),
      toSharedY(metricValues[index]),
    ]);

  const legendStartX =
    svgWidth / 2 - 95;

  return (
    <div
      ref={containerRef}
      style={{ width: '100%' }}
    >
      <svg
        width={svgWidth}
        height={SVG_HEIGHT}
      >
        {/* Legend */}
        <rect
          x={legendStartX}
          y={8}
          width={11}
          height={11}
          fill="var(--chart-line-spend)"
          rx={2}
        />

        <text
          x={legendStartX + 14}
          y={17}
          fontSize={11}
          fill="var(--chart-text)"
        >
          {t('metrics.promoSpend')}
        </text>

        <rect
          x={legendStartX + 100}
          y={8}
          width={11}
          height={11}
          fill="var(--chart-line-metric)"
          rx={2}
        />

        <text
          x={legendStartX + 114}
          y={17}
          fontSize={11}
          fill="var(--chart-text)"
        >
          {secondaryLabel}
        </text>

        {/* Horizontal gridlines */}
        {sharedAxisTicks.map(
          (tickValue) => {
            const tickY =
              toSharedY(tickValue);

            if (
              tickY < PAD_TOP - 1 ||
              tickY >
                PAD_TOP +
                  PLOT_HEIGHT +
                  1
            ) {
              return null;
            }

            return (
              <line
                key={tickValue}
                x1={PAD_LEFT}
                x2={
                  PAD_LEFT +
                  plotWidth
                }
                y1={tickY}
                y2={tickY}
                stroke="var(--chart-grid)"
                strokeWidth={1}
              />
            );
          }
        )}

        {/* Spend and metric smooth lines */}
        <path
          d={smoothCubicPath(spendPoints)}
          fill="none"
          stroke="var(--chart-line-spend)"
          strokeWidth={2.5}
        />

        <path
          d={smoothCubicPath(metricPoints)}
          fill="none"
          stroke="var(--chart-line-metric)"
          strokeWidth={2.5}
        />

        {/* X-axis with week labels */}
        <line
          x1={PAD_LEFT}
          x2={PAD_LEFT + plotWidth}
          y1={PAD_TOP + PLOT_HEIGHT}
          y2={PAD_TOP + PLOT_HEIGHT}
          stroke="var(--chart-border)"
        />

        {denseWeeks.map((row, index) => {
          if (
            index % weekLabelStep !== 0
          ) {
            return null;
          }

          return (
            <text
              key={row.week}
              x={xPosition(index)}
              y={
                PAD_TOP +
                PLOT_HEIGHT +
                16
              }
              fontSize={9}
              fill="var(--chart-label)"
              textAnchor="middle"
            >
              W{row.week}
            </text>
          );
        })}

        {/* Y-axis on shared currency scale */}
        <line
          x1={PAD_LEFT}
          x2={PAD_LEFT}
          y1={PAD_TOP}
          y2={PAD_TOP + PLOT_HEIGHT}
          stroke="var(--chart-border)"
        />

        {sharedAxisTicks.map(
          (tickValue) => {
            const tickY =
              toSharedY(tickValue);

            if (
              tickY < PAD_TOP - 3 ||
              tickY >
                PAD_TOP +
                  PLOT_HEIGHT +
                  3
            ) {
              return null;
            }

            return (
              <g key={tickValue}>
                <line
                  x1={PAD_LEFT - 4}
                  x2={PAD_LEFT}
                  y1={tickY}
                  y2={tickY}
                  stroke="var(--chart-axis)"
                />

                <text
                  x={PAD_LEFT - 7}
                  y={tickY + 4}
                  fontSize={10}
                  fill="var(--chart-text)"
                  textAnchor="end"
                >
                  {formatKc(tickValue)}
                </text>
              </g>
            );
          }
        )}

        <text
          x={20}
          y={
            PAD_TOP +
            PLOT_HEIGHT / 2
          }
          fontSize={10}
          fill="var(--chart-text)"
          textAnchor="middle"
          transform={`rotate(-90 20 ${
            PAD_TOP +
            PLOT_HEIGHT / 2
          })`}
        >
          {currencySymbol}
        </text>
      </svg>
    </div>
  );
});

SkuTrendChart.displayName = 'SkuTrendChart';
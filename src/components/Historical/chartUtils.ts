// Computes evenly-spaced, human-readable tick values between min and max
export function niceTicks(min: number, max: number, targetCount = 5): number[] {
  if (max === min) return [min];

  const range = max - min;
  const rawStep = range / targetCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));

  const niceStep =
    ([1, 2, 2.5, 5, 10] as number[])
      .find((f) => f * magnitude >= rawStep)! * magnitude;

  const ticks: number[] = [];

  for (
    let tick = Math.ceil(min / niceStep) * niceStep;
    tick <= max + niceStep * 0.01;
    tick += niceStep
  ) {
    ticks.push(Math.round(tick * 1e9) / 1e9);
  }

  return ticks;
}

// Formats a numeric currency value with comma separators.
// The currency symbol is added by the consuming component.
// Formats a numeric currency value.
// Currency symbol is added separately by the consuming component.
export function formatKc(value: number): string {
  if (value === 0) return '0';

  return value.toLocaleString('en-US', {
    maximumFractionDigits: 1,
  });
}

// Formats a number to one decimal place
export function formatDecimal(value: number): string {
  return value.toFixed(1);
}

// Builds a smooth SVG path using Catmull-Rom → cubic Bézier conversion
export function smoothCubicPath(
  points: [number, number][],
  tension = 0.4,
): string {
  if (points.length < 2) {
    return points.length
      ? `M ${points[0][0]} ${points[0][1]}`
      : '';
  }

  const segments: string[] = [
    `M ${points[0][0]} ${points[0][1]}`,
  ];

  for (let index = 0; index < points.length - 1; index++) {
    const prev = points[Math.max(index - 1, 0)];
    const curr = points[index];
    const next = points[index + 1];
    const after = points[Math.min(index + 2, points.length - 1)];

    const cp1x =
      curr[0] + (tension * (next[0] - prev[0])) / 2;

    const cp1y =
      curr[1] + (tension * (next[1] - prev[1])) / 2;

    const cp2x =
      next[0] - (tension * (after[0] - curr[0])) / 2;

    const cp2y =
      next[1] - (tension * (after[1] - curr[1])) / 2;

    segments.push(
      `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ` +
      `${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ` +
      `${next[0].toFixed(1)} ${next[1].toFixed(1)}`,
    );
  }

  return segments.join(' ');
}
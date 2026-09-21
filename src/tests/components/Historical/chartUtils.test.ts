import { describe, expect, it } from 'vitest';

import { formatDecimal, formatKc, niceTicks, smoothCubicPath } from '~/components/Historical/chartUtils';

describe('chartUtils', () => {
  it('returns single tick when min equals max', () => {
    expect(niceTicks(10, 10)).toEqual([10]);
  });

  it('builds nice ticks across a range', () => {
    expect(niceTicks(0, 100, 4)).toEqual([0, 25, 50, 75, 100]);
    expect(niceTicks(-5, 5, 4)).toEqual([-5, -2.5, 0, 2.5, 5]);
  });

  it('formats kc and decimals', () => {
    expect(formatKc(0)).toBe('0');
    expect(formatKc(1234567.89)).toBe('1,234,567.9');
    expect(formatDecimal(3)).toBe('3.0');
    expect(formatDecimal(3.14159)).toBe('3.1');
  });

  it('builds smooth path edge cases and multi-point output', () => {
    expect(smoothCubicPath([])).toBe('');
    expect(smoothCubicPath([[1, 2]])).toBe('M 1 2');

    const path = smoothCubicPath(
      [
        [0, 0],
        [10, 10],
        [20, 0],
      ],
      0.4,
    );

    expect(path.startsWith('M 0 0 C')).toBe(true);
    expect(path).toContain('10.0 10.0');
    expect(path).toContain('20.0 0.0');
  });
});

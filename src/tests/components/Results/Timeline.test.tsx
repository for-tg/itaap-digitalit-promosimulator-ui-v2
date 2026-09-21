import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { Timeline } from '~/components/Results/Timeline';

afterEach(cleanup);

describe('Timeline', () => {
  it('returns null when timeline has no skus', () => {
    const { container } = render(
      <Timeline timeline={{}} calMode="recommended" setCalMode={vi.fn()} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders compare mode, sku rows, and mode controls', () => {
    const setCalMode = vi.fn();

    render(
      <Timeline
        calMode="compare"
        setCalMode={setCalMode}
        timeline={{
          'VERY-LONG-SKU-CODE-12345': {
            codes: [],
            opt_disc: [0, 10, 20],
            act_disc: [5, 0, 15],
          },
        }}
      />,
    );

    expect(screen.getByText('optimizedView.calendar.promotionalCalendarWeeks')).toBeInTheDocument();
    expect(screen.getByText('VERY-LONG-SKU-…')).toBeInTheDocument();
    expect(document.querySelectorAll('.week.week-split').length).toBe(52);
    expect(screen.getByText('optimizedView.calendar.historicalVsOptimized')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'optimizedView.calendar.optimized' }));
    fireEvent.click(screen.getByRole('button', { name: 'optimizedView.calendar.historical' }));

    expect(setCalMode).toHaveBeenCalledWith('recommended');
    expect(setCalMode).toHaveBeenCalledWith('actual');
  });
});

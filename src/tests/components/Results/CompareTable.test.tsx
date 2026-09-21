import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { CompareTable } from '~/components/Results/CompareTable';

afterEach(cleanup);

describe('CompareTable', () => {
  it('renders comparison rows', () => {
    render(
      <CompareTable
        compare={{
          current: { turnover: 100, profit: 50, margin: 10, qty: 5, promo_weeks: 2, promo_spend: 10 },
          historical: { turnover: 90, profit: 40, margin: 8, qty: 4, promo_weeks: 1, promo_spend: 8, year: 2024 },
          recommended: { turnover: 120, profit: 60, margin: 12, qty: 6, promo_weeks: 3, promo_spend: 12, effective_turnover: 120, delta_effective_turnover: 20, delta_effective_pct: 22 },
        }}
      />,
    );

    expect(screen.getByText('optimizedView.comparison.title')).toBeInTheDocument();
    expect(screen.getByText('metrics.turnover')).toBeInTheDocument();
  });
});
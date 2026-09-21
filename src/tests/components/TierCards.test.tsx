import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TierCards } from '~/components/Results/TierCards';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) => {
      if (key === 'optimizedView.recommendations.actions') {
        return `${opts?.count ?? 0} actions`;
      }

      const map: Record<string, string> = {
        'optimizedView.recommendations.title': 'Recommendations',
        'optimizedView.recommendations.highPriority': 'High Priority',
        'optimizedView.recommendations.mediumPriority': 'Medium Priority',
        'optimizedView.recommendations.lowPriority': 'Low Priority',
        'metrics.revenue': 'Revenue',
        'metrics.profit': 'Profit',
      };

      return map[key] ?? key;
    },
  }),
}));

const makeActions = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    sku: `SKU-${index + 1}`,
    week: index + 1,
    weeks_label: `W${index + 1}`,
    discount_text: '5%',
    action_text: `Action ${index + 1}`,
    impact: index + 10,
    action_type: 'PROMO',
  }));

describe('TierCards', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders section title and tier labels', () => {
    render(
      <TierCards
        objective="profit"
        tiers={{
          definitely_do: { count: 1, total_gain: 1000, actions: makeActions(1) },
          worth_considering: { count: 0, total_gain: 0, actions: [] },
          minor_impact: { count: 0, total_gain: 0, actions: [] },
        }}
      />,
    );

    expect(screen.getByText('Recommendations')).toBeInTheDocument();
    expect(screen.getByText('High Priority')).toBeInTheDocument();
    expect(screen.getByText('Medium Priority')).toBeInTheDocument();
    expect(screen.getByText('Low Priority')).toBeInTheDocument();
  });

  it('shows only first three actions initially and expands on click', async () => {
    const user = userEvent.setup();

    const { container } = render(
      <TierCards
        objective="profit"
        tiers={{
          definitely_do: { count: 5, total_gain: 1500, actions: makeActions(5) },
          worth_considering: { count: 0, total_gain: 0, actions: [] },
          minor_impact: { count: 0, total_gain: 0, actions: [] },
        }}
      />,
    );

    const recommendations = within(container).getByText('Recommendations').closest('.section-block');
    const scoped = within((recommendations ?? container) as HTMLElement);
    const highPriorityCard = scoped.getByText('High Priority').closest('.rec-card');
    const highPriorityScoped = within((highPriorityCard ?? container) as HTMLElement);

    expect(highPriorityScoped.getByText('Action 1')).toBeInTheDocument();
    expect(highPriorityScoped.getByText('Action 2')).toBeInTheDocument();
    expect(highPriorityScoped.getByText('Action 3')).toBeInTheDocument();
    expect(highPriorityScoped.queryByText('Action 4')).not.toBeInTheDocument();

    const showMoreBtn = highPriorityScoped.getByRole('button', { name: /more actions/i });
    await user.click(showMoreBtn);

    expect(highPriorityScoped.getByText('Action 4')).toBeInTheDocument();
    expect(highPriorityScoped.getByText('Action 5')).toBeInTheDocument();

    const showLessBtn = highPriorityScoped.getByRole('button', { name: /show less/i });
    await user.click(showLessBtn);
    expect(highPriorityScoped.queryByText('Action 5')).not.toBeInTheDocument();
  });

  it('uses revenue unit when objective is turnover', () => {
    const { container } = render(
      <TierCards
        objective="turnover"
        tiers={{
          definitely_do: { count: 1, total_gain: 123, actions: makeActions(1) },
          worth_considering: { count: 0, total_gain: 0, actions: [] },
          minor_impact: { count: 0, total_gain: 0, actions: [] },
        }}
      />,
    );

    const scoped = within(container);
    const gainNode = scoped.getAllByText(/Revenue/).find((node) =>
      node.classList.contains('rc-gain'),
    );

    expect(gainNode).toBeTruthy();
  });
});

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { HeroSection } from '~/components/Results/HeroSection';

afterEach(cleanup);

describe('HeroSection', () => {
  it('renders hero metrics and verdict content', () => {
    render(
      <HeroSection
        hero={{
          eyebrow: 'Hero',
          pill_text: '',
          value: '120',
          label: 'Profit',
          delta: '+10%',
          verdict: '<b>Good</b>',
          confidence: 'High',
          data_sub: 'Data',
          margin_html: '<span>18%</span>',
          budget_used: '80%',
          budget_sub: 'Budget',
        }}
      />,
    );

    expect(screen.getByText('Hero')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('renders loss delta state and hides empty budget subtitle', () => {
    const { container } = render(
      <HeroSection
        hero={{
          eyebrow: 'Hero 2',
          pill_text: '',
          value: '90',
          label: 'Revenue',
          delta: '-4%',
          verdict: '<i>Watch</i>',
          confidence: 'Medium',
          data_sub: 'Data 2',
          margin_html: '<span>9%</span>',
          budget_used: '100%',
          budget_sub: '',
        }}
      />,
    );

    expect(container.querySelector('.up-line')?.className).toContain('loss');
    expect(screen.getByText('Watch')).toBeInTheDocument();
    expect(screen.queryByText('Budget')).not.toBeInTheDocument();
  });
});
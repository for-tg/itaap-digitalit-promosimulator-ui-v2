import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { WhyReasons } from '~/components/Results/WhyReasons';

afterEach(cleanup);

describe('WhyReasons', () => {
  it('renders reason cards', () => {
    render(<WhyReasons reasons={[{ num: '1', tag: 'Tag', title: 'Title', body: '<p>Body</p>' }]} />);
    expect(screen.getByText('optimizedView.recommendationInsights.title')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('returns no section when reasons are empty', () => {
    const { container } = render(<WhyReasons reasons={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
import { typography } from '@filament/atomic-styles';
import { cleanup, render, screen } from '@testing-library/react';
import { describe, expect, it, afterEach, beforeEach } from 'vitest';

import { Footer } from '~/components/Footer';

describe('Footer component', () => {
  beforeEach(() => {
    render(<Footer />);
  });

  afterEach(cleanup);

  it('should render the text', () => {
    expect(screen.getByText('footer.copyright')).toBeInTheDocument();
  });

  it('should render the text using the correct variant', () => {
    expect(screen.getByText('footer.copyright')).toHaveClass(
      typography({ variant: 'reference-m' })
    );
  });
});

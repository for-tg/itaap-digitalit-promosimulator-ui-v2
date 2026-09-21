import { size } from '@filament/spinner-styles';
import { cleanup, render, screen } from '@testing-library/react';
import { expect, describe, it, afterEach } from 'vitest';

import { Loader } from '~/components/Loader';

describe('Loader component', () => {
  afterEach(cleanup);

  it('should render using a normal size', () => {
    render(<Loader />);
    expect(screen.getByRole('figure')).toHaveClass(size.normal);
  });
});

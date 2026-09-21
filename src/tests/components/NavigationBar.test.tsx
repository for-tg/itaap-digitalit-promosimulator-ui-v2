import { avatar } from '@filament/react/styles';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { NavigationBar } from '~/components/NavigationBar';

describe('NavigationBar component', () => {
  beforeEach(() => {
    render(
      <MemoryRouter>
        <NavigationBar />
      </MemoryRouter>
    );
  });

  afterEach(cleanup);

  it('should render the app name', () => {
    expect(screen.getByText('app.shortTitle')).toBeInTheDocument();
  });

  it('should render the Avatar', () => {
    expect(screen.getByRole('figure')).toHaveClass(avatar);
  });

  it('should render the default user name when no account is active', () => {
    expect(screen.getByText('common.defaultUser')).toBeInTheDocument();
  });
});

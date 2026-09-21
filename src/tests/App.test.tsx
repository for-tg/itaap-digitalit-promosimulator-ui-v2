import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  appConfigs: {
    ENABLE_SSO: false,
  },
}));

vi.mock('react-router-dom', () => ({
  RouterProvider: () => <div data-testid="router-provider">router</div>,
}));

vi.mock('@filament/react', () => ({
  Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@filament/react/styles', () => ({
  atomicBackgroundPrimary: 'atomicBackgroundPrimary',
  base: 'base',
}));

vi.mock('@filament/react/themes', () => ({
  blue: 'blue',
  light: 'light',
  medium: 'medium',
}));

vi.mock('@azure/msal-browser', () => ({
  InteractionType: { Redirect: 'redirect' },
}));

vi.mock('@azure/msal-react', () => ({
  MsalAuthenticationTemplate: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="msal-template">{children}</div>
  ),
}));

vi.mock('~/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('~/contexts/ProjectsContext', () => ({
  ProjectsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('~/contexts/SimulatorContext', () => ({
  SimulatorProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('~/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('~/routes', () => ({
  router: {},
}));

vi.mock('~/utils/msalConfig', () => ({
  loginRequest: { scopes: ['scope'] },
}));

vi.mock('~/utils/appConfig', () => ({
  appConfigs: mockState.appConfigs,
}));

import { App } from '~/App';

afterEach(() => {
  document.body.innerHTML = '';
  mockState.appConfigs.ENABLE_SSO = false;
});

describe('App', () => {
  it('renders router without MSAL template when SSO is disabled', () => {
    mockState.appConfigs.ENABLE_SSO = false;

    render(<App />);

    expect(screen.getByTestId('router-provider')).toBeInTheDocument();
    expect(screen.queryByTestId('msal-template')).not.toBeInTheDocument();
  });

  it('renders router inside MSAL template when SSO is enabled', () => {
    mockState.appConfigs.ENABLE_SSO = true;

    render(<App />);

    expect(screen.getByTestId('router-provider')).toBeInTheDocument();
    expect(screen.getByTestId('msal-template')).toBeInTheDocument();
  });
});

import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('~/components/Loader', () => ({
  Loader: () => <div>loading-route</div>,
}));

vi.mock('~/screens/ErrorScreen', () => ({
  ErrorScreen: () => <div>error-screen</div>,
}));

vi.mock('~/screens/ProjectsDashboard', () => ({
  ProjectsDashboard: () => <div>projects-dashboard-screen</div>,
}));

vi.mock('~/screens/SimulatorScreen', () => ({
  SimulatorScreen: () => <div>simulator-screen</div>,
}));

vi.mock('~/screens/AccessScreen', () => ({
  AccessScreen: () => <div>access-screen</div>,
}));

vi.mock('~/screens/AdminAccessScreen', () => ({
  AdminAccessScreen: () => <div>admin-access-screen</div>,
}));

import { router } from '~/routes';

afterEach(() => {
  cleanup();
});

describe('routes', () => {
  it('contains expected application paths', () => {
    const routes = (router as unknown as { routes: Array<{ path: string }> }).routes;
    const paths = routes.map((route) => route.path);

    expect(paths).toEqual(
      expect.arrayContaining([
        '/',
        '/projects',
        '/access',
        '/admin/access',
        '/project/:projectId/scenario/:scenarioId',
      ]),
    );
  });

  it('assigns errorElement for each route', () => {
    const routes = (
      router as unknown as {
        routes: Array<{ path: string; errorElement?: unknown }>;
      }
    ).routes;

    routes.forEach((route) => {
      expect(route.errorElement, `missing errorElement for ${route.path}`).toBeTruthy();
    });
  });

  it.each([
    { path: '/', text: 'projects-dashboard-screen' },
    { path: '/projects', text: 'projects-dashboard-screen' },
    { path: '/access', text: 'access-screen' },
    { path: '/admin/access', text: 'admin-access-screen' },
    { path: '/project/:projectId/scenario/:scenarioId', text: 'simulator-screen' },
  ])('renders lazy route element for $path through suspense wrapper', async (testCase) => {
    const routes = (
      router as unknown as {
        routes: Array<{ path: string; element: unknown }>;
      }
    ).routes;

    const route = routes.find((r) => r.path === testCase.path);
    expect(route).toBeTruthy();
    render(route!.element as ReactNode);
    expect(await screen.findByText(testCase.text)).toBeInTheDocument();
  });
});

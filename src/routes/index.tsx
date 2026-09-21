import { lazy, Suspense } from 'react';
import { createHashRouter } from 'react-router-dom';

import { ErrorScreen } from '~/screens/ErrorScreen';
import { Loader } from '~/components/Loader';

const ProjectsDashboard = lazy(() =>
  import('~/screens/ProjectsDashboard').then((m) => ({ default: m.ProjectsDashboard }))
);

const SimulatorScreen = lazy(() =>
  import('~/screens/SimulatorScreen').then((m) => ({ default: m.SimulatorScreen }))
);

const AccessScreen = lazy(() =>
  import('~/screens/AccessScreen').then((m) => ({ default: m.AccessScreen }))
);

const AdminAccessScreen = lazy(() =>
  import('~/screens/AdminAccessScreen').then((m) => ({
    default: m.AdminAccessScreen,
  }))
);

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<Loader />}>{element}</Suspense>
);

export const router = createHashRouter([
  {
    path: '/',
    element: withSuspense(<ProjectsDashboard />),
    errorElement: <ErrorScreen />,
  },
  {
    path: '/projects',
    element: withSuspense(<ProjectsDashboard />),
    errorElement: <ErrorScreen />,
  },
  {
    path: '/access',
    element: withSuspense(<AccessScreen />),
    errorElement: <ErrorScreen />,
  },
  {
    path: '/admin/access',
    element: withSuspense(<AdminAccessScreen />),
    errorElement: <ErrorScreen />,
  },
  {
    path: '/project/:projectId/scenario/:scenarioId',
    element: withSuspense(<SimulatorScreen />),
    errorElement: <ErrorScreen />,
  },
]);